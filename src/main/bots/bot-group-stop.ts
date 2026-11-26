import { botGroupRoom } from '../../shared/bots/bot-group'
import { structuredAgentSessionPayloadFingerprint } from '../../shared/agent-session/lifecycle/operations/structured-agent-session-mutation'
import { runKeyedSerializedOperation } from '../../shared/concurrency/keyed-serialized-operations'
import { mintAgentSessionOperationId } from '../runtime/orchestration/mailbox/structured-pointer/structured-pointer-operation-id'
import { requireStructuredHost } from './bot-chat-session'
import type { BotGroupRuntime } from './bot-group-runtime'
import { updateTurnDelivery } from './bot-group-turn-delivery'

/** The cutoff and the cancels are one room operation, so a send at the new revision cannot start
 *  a turn that a late cancel then stops. */
export function stopBotGroup(
  groups: BotGroupRuntime,
  groupId: string,
  botId?: string,
  threadId?: string
) {
  return runKeyedSerializedOperation(groups.queues, groupId, async () => {
    const group = groups.store.get(groupId)
    const previous = botGroupRoom(group, threadId)
    const sequence = groups.store.roomMessages(groupId, threadId, 1)[0]?.sequence ?? 0
    const stopping = (member: { botId: string }) => !botId || member.botId === botId
    const members = previous.members.map((member) =>
      stopping(member) ? { ...member, stoppedThroughSequence: sequence } : member
    )
    groups.store.put({
      ...group,
      revision: group.revision + 1,
      ...(threadId
        ? {
            threads: group.threads?.map((thread) =>
              thread.id === threadId ? { ...thread, members } : thread
            )
          }
        : { members })
    })
    groups.changed()
    const sessions = new Set(previous.members.filter(stopping).map((member) => member.sessionId))
    for (const { message, turn } of groups.store.pending()) {
      if (
        message.groupId === groupId &&
        message.threadId === threadId &&
        sessions.has(turn.sessionId)
      ) {
        groups.store.delivered([turn.operationId])
        updateTurnDelivery(groups, message.id, turn.operationId, {
          error: 'This group request was stopped.',
          retryable: undefined,
          retryAt: undefined
        })
      }
    }
    for (const sessionId of sessions) {
      groups.deliveryQueue.release(sessionId)
    }
    const host = await requireStructuredHost(groups.runtime)
    return Promise.all(
      previous.members.filter(stopping).map(async ({ sessionId }) => {
        try {
          return await host.cancel(
            { callerKey: `bot-group-stop:${groupId}` },
            {
              envelope: {
                sessionId,
                clientOperationId: mintAgentSessionOperationId(Date.now()),
                expectedRuntimeFence:
                  host.deps.store.requireWritableRecord(sessionId).lease.runtimeFence,
                payloadFingerprint: structuredAgentSessionPayloadFingerprint({
                  method: 'agentSession.cancel',
                  sessionId,
                  fields: {}
                })
              }
            }
          )
        } catch (error) {
          return {
            ok: false as const,
            refusal: { message: error instanceof Error ? error.message : String(error) }
          }
        }
      })
    )
  })
}
