import { mapWithConcurrency } from '../../../../../../shared/concurrency/map-with-concurrency'
import { botGroupAudience } from '../../../../../../shared/bots/bot-group-mentions'
import { runtimeBotGroups } from '../../../../../bots/bot-group-runtime'
import { sessionCallerOf } from '../../../../orchestration/addressing/orchestration-caller-identity'
import { OrchestrationError } from '../../../../orchestration/orchestration-error'
import { sendToBot } from './bot-request-send'
import { sessionAddress } from './bot-request-conversation'
import { recordReceiptBeforeNudge } from './mutation-replay-nudge'
import type { SendParams } from './send-params'
import type { z } from 'zod'
import type { OrchestrationPartyIdentity } from '../../../../../../shared/orchestration/mailbox/orchestration-party-identity'

export async function sendBotGroupMail(
  context: Parameters<typeof sendToBot>[0],
  params: z.infer<typeof SendParams>,
  sender: OrchestrationPartyIdentity
) {
  const roomId = params.to?.slice('group:'.length)
  const caller = sessionCallerOf(context.orchestrationCaller)
  const groups = runtimeBotGroups(context.runtime)
  const found = caller ? groups.store.memberOf(caller.sessionId) : null
  if (!found || (found.threadId ?? found.group.id) !== roomId) {
    throw new OrchestrationError(
      'forbidden',
      'Only a current member can send to its own group room.'
    )
  }
  if (
    params.chat ||
    params.item ||
    params.on ||
    params.run ||
    params.payload ||
    !['status', 'question', 'handoff'].includes(params.type ?? 'status')
  ) {
    throw new OrchestrationError(
      'invalid_argument',
      'Group rooms accept status, question or handoff messages without task, chat or server routing flags.'
    )
  }
  const bots = context.runtime.bots.list()
  const audience = new Set(
    botGroupAudience(
      params.body ?? params.subject,
      {
        ...found.group,
        replyMode: { kind: 'all' }
      },
      bots
    )
  )
  const recipients = found.group.members.filter(
    (member) => member.sessionId !== caller?.sessionId && audience.has(member.botId)
  )
  if (!recipients.length) {
    throw new OrchestrationError('invalid_argument', 'No other current room member was addressed.')
  }
  const results = await mapWithConcurrency(recipients, 4, async (member) => {
    try {
      const accepted = await sendToBot(
        { ...context, recordMutationReceipt: undefined },
        {
          params: { ...params, type: params.type ?? 'status' },
          from: sender.address,
          to: sessionAddress(member.sessionId),
          sender,
          routing: { run: undefined }
        }
      )
      if (!accepted) {
        throw new Error('The recipient is no longer a reachable room member.')
      }
      return { botId: member.botId, accepted }
    } catch (error) {
      return { botId: member.botId, error: error instanceof Error ? error.message : String(error) }
    }
  })
  const messages = results.flatMap(({ accepted }) => {
    const receipt = accepted?.receipt
    return receipt && typeof receipt === 'object' && 'message' in receipt ? [receipt.message] : []
  })
  const warnings = results.flatMap(({ botId, error }) =>
    error
      ? [
          {
            code: 'recipient_unreachable',
            recipient: botId,
            message: error
          }
        ]
      : []
  )
  const receipt = { roomId, messages, recipients: messages.length, warnings }
  return recordReceiptBeforeNudge(context.recordMutationReceipt, receipt, () => {
    for (const { accepted } of results) {
      accepted?.nudge()
    }
  })
}
