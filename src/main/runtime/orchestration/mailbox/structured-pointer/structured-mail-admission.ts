import type { MessageRow } from '../../db/orchestration-records'
import type { OrchestrationDb } from '../../db/orchestration-db'
import type { SenderSnapshotResolver } from '../senders/agent-message-sender'
import {
  shouldReleaseOrchestrationPointer,
  type OrchestrationMessageWaiter
} from '../terminal-pointer/mailbox-pointer-eligibility'
import { mintAgentSessionOperationId } from './structured-pointer-operation-id'
import type {
  StructuredMailFollowUp,
  StructuredPointerDeliveryDependencies
} from './structured-mailbox-pointer-host-contract'
import type { StructuredPointerTarget } from './structured-mailbox-pointer-delivery'
import { structuredMailMessage } from '../structured-mail/structured-mail-source'
import type { StructuredMailSendRow } from '../../db/messages/structured-mail-send-store'
import type { QueuedMessageOwed } from '../../../../native-chat/agent-session-journal/queued-messages/queued-message-consume-error'
import * as mailCustody from '../structured-mail/structured-mail-custody'
import { readyStructuredMailFence } from './structured-mail-recipient-readiness'

export function createStructuredMailAdmission<TWaiter extends OrchestrationMessageWaiter>({
  deps,
  authority,
  replyFollowUp,
  redeliver
}: {
  deps: StructuredPointerDeliveryDependencies<TWaiter>
  authority: mailCustody.StructuredMailAuthority
  replyFollowUp: StructuredMailFollowUp
  redeliver: (mailbox: string) => void
}) {
  return async (
    db: OrchestrationDb,
    mailboxHandle: string,
    target: StructuredPointerTarget,
    message: MessageRow,
    senderSnapshot: SenderSnapshotResolver,
    again?: mailCustody.StructuredMailResend
  ): Promise<'next' | 'park'> => {
    const sessionId = target.sessionId
    // Read before the fence, so a slow item read cannot leave the send a stale one; it never stops the send.
    const reportItem = deps.reportItem ? await deps.reportItem(db, message).catch(() => null) : null
    const fence = await readyStructuredMailFence(
      deps,
      authority,
      db,
      mailboxHandle,
      target,
      message.id
    )
    if (fence === null) {
      return 'park'
    }
    const { body } = structuredMailMessage({
      db,
      mailboxHandle,
      ...target,
      message,
      cliCommand: deps.getCliCommand(),
      senderSnapshot,
      followUp: replyFollowUp(db, message, sessionId),
      reportItem,
      conversationPlace: (from) => deps.conversationPlace?.(sessionId, from) ?? null
    })
    const attempt: StructuredMailSendRow = {
      mailbox_handle: mailboxHandle,
      message_id: message.id,
      session_id: sessionId,
      operation_id:
        again && !again.renew ? again.row.operation_id : mintAgentSessionOperationId(Date.now()),
      minted_at_ms: again && !again.renew ? again.row.minted_at_ms : Date.now()
    }
    // Reserved before the send, with its delivered stamp, so a crash after it lands finds the card
    // instead of sending twice. Only the pass whose reservation lands sends.
    if (!db.reserveStructuredMailSend(attempt, again?.row.operation_id)) {
      return 'next'
    }
    // The host's last answer, set inside its own check: a holder, so the read after the send sees it.
    const last: { owed: QueuedMessageOwed } = { owed: 'owed' }
    const outcome = await deps.host.send({
      sessionId,
      dispatchId: target.dispatchId,
      operationId: attempt.operation_id,
      expectedRuntimeFence: fence,
      body,
      stillOwed: () => {
        last.owed = authority.owedTo(sessionId, mailboxHandle, [message.id])
        return (
          deps.host.mailAllowed?.(message.id) !== false &&
          last.owed === 'owed' &&
          !shouldReleaseOrchestrationPointer(
            deps.getDb(),
            mailboxHandle,
            [message],
            deps.getMessageWaiters(mailboxHandle)
          )
        )
      }
    })
    switch (outcome.kind) {
      case 'unattached':
      case 'refused':
        // Refused before admission (a full queue, a detached chat): retry on the session's next edge.
        db.releaseStructuredMailSend(attempt)
        return 'park'
      case 'obsolete':
        db.releaseStructuredMailSend(attempt)
        if (last.owed === 'stale') {
          // Custody moved during the send: its owner now, a terminal included, is told.
          queueMicrotask(() => redeliver(mailboxHandle))
        }
        return last.owed === 'unavailable' ? 'park' : 'next'
      case 'queued':
        return 'next'
      case 'sent':
        // In doubt, including a resend the host answered from an earlier admission: never again.
        if (outcome.state === 'accepted' || outcome.state === 'unknown') {
          const observed = await mailCustody.observeStructuredMailAttempt(deps.host, attempt)
          const settled = mailCustody.settleStructuredMailAttempt(db, attempt, observed, () =>
            authority.owedTo(sessionId, mailboxHandle, [message.id])
          )
          if (settled.released) {
            queueMicrotask(() => redeliver(mailboxHandle))
          }
        }
        // Pending or rejected: the record decides on a later pass.
        return 'next'
    }
  }
}
