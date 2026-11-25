import type { OrchestrationDb } from '../../db/orchestration-db'
import { ownerAdjustedOwed } from '../../structured-mail-owner-narrowing'
import type { StructuredMailAuthority } from '../structured-mail/structured-mail-custody'
import type { StructuredPointerTarget } from './structured-mailbox-pointer-delivery'
import type { StructuredMailboxPointerHost } from './structured-mailbox-pointer-host-contract'

export async function readyStructuredMailFence(
  deps: {
    host: StructuredMailboxPointerHost
    resolveStructuredTarget: (mailbox: string) => StructuredPointerTarget | null
  },
  authority: StructuredMailAuthority,
  db: OrchestrationDb,
  mailbox: string,
  target: StructuredPointerTarget,
  messageId: string
): Promise<number | null> {
  const { sessionId } = target
  const stillOwed = () => {
    const current = deps.resolveStructuredTarget(mailbox)
    return (
      current?.sessionId === sessionId &&
      current.dispatchId === target.dispatchId &&
      ownerAdjustedOwed(
        authority.owedTo(sessionId, mailbox, [messageId]),
        deps.host,
        sessionId,
        [messageId],
        db
      ) === 'owed'
    )
  }
  if (!stillOwed() || (deps.host.prepare && !(await deps.host.prepare(sessionId)))) {
    return null
  }
  return stillOwed() ? deps.host.currentFence(sessionId) : null
}
