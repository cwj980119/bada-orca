import {
  assertTurnActive,
  deliverTurn,
  recordTurnError,
  updateTurnDelivery
} from './bot-group-turn-delivery'
import type { z } from 'zod'
import {
  botGroupCompletedText,
  botGroupContext,
  isBotGroupMemberSession,
  type BotGroupMessage,
  type BotGroupSend,
  type BotGroupTurn
} from '../../shared/bots/bot-group'
import { botGroupAudience } from '../../shared/bots/bot-group-mentions'
import { runKeyedSerializedOperation } from '../../shared/concurrency/keyed-serialized-operations'
import { mintAgentSessionOperationId } from '../runtime/orchestration/mailbox/structured-pointer/structured-pointer-operation-id'
import { requireGroupBots } from './bot-group-membership'
import { botChatReads } from './bot-chat-reads'
import type { AgentJournalRenderItem } from '../../shared/agent-session/journal/agent-session-journal-types'
import type { BotGroupRuntime } from './bot-group-runtime'

export async function sendBotGroupMessage(
  groups: BotGroupRuntime,
  input: z.infer<typeof BotGroupSend>
): Promise<BotGroupMessage> {
  const message = await runKeyedSerializedOperation(groups.queues, input.groupId, async () => {
    const existing = groups.store.message(input.messageId)
    if (existing) {
      if (
        existing.groupId !== input.groupId ||
        existing.threadId !== input.threadId ||
        existing.text !== input.text
      ) {
        throw new Error('Message identity was already used.')
      }
      return existing
    }
    const group = groups.store.room(input.groupId, input.threadId)
    if (group.revision !== input.revision) {
      throw new Error('The group changed. Review the current members before sending.')
    }
    if (group.members.length === 0) {
      throw new Error('Every bot has left this group. Add a bot before sending.')
    }
    const bots = requireGroupBots(
      groups,
      group.members.map((member) => member.botId)
    )
    const history = groups.store.roomMessages(group.id, input.threadId, 40)
    const completed = await completedReplies(groups, history)
    const contexts = new Map<string, string>()
    const turns = botGroupAudience(input.text, group, bots).flatMap((botId) => {
      const bot = bots.find((bot) => bot.id === botId)
      const member = group.members.find((member) => member.botId === botId)
      if (!bot || !member) {
        return []
      }
      const operationId = mintAgentSessionOperationId(Date.now())
      contexts.set(operationId, botGroupContext(history, completed, member))
      const { name: botName, avatar, agent } = bot
      return [{ operationId, botId, botName, avatar, agent, sessionId: member.sessionId }]
    })
    const stored = groups.store.append(
      {
        id: input.messageId,
        groupId: group.id,
        ...(input.threadId ? { threadId: input.threadId } : {}),
        author: { kind: 'owner' },
        text: input.text,
        groupName: group.name,
        createdAt: Date.now(),
        deadlineAt: Date.now() + (input.timeoutMs ?? 900_000),
        peerTurnLimit: input.maxPeerTurns ?? 32,
        turns
      },
      contexts
    )
    groups.store.setLatest(
      group.id,
      { authorName: null, text: stored.text, at: stored.createdAt },
      { post: stored.sequence }
    )
    if (input.threadId) {
      titleThread(groups, input.threadId, stored)
    }
    return stored
  })
  groups.changed()
  for (const turn of message.turns) {
    queueTurn(groups, message, turn)
  }
  return message
}

/** A thread is named by its first post, cut to one line. */
function titleThread(groups: BotGroupRuntime, threadId: string, message: BotGroupMessage): void {
  const group = groups.store.get(message.groupId)
  if (group.threads?.find((thread) => thread.id === threadId)?.title) {
    return
  }
  const title = message.text.replace(/\s+/g, ' ').trim().slice(0, 80)
  groups.store.put({
    ...group,
    threads: group.threads?.map((thread) =>
      thread.id === threadId ? { ...thread, title } : thread
    )
  })
}

/** Each finished turn's reply text, keyed by operation: saved when the turn ended, or a retired
 *  member's from its frozen rows. Only turns saved before replies were read their member's chat. */
async function completedReplies(
  groups: BotGroupRuntime,
  messages: readonly BotGroupMessage[]
): Promise<Map<string, string>> {
  const turns = messages.flatMap((message) => message.turns)
  const unsaved = Map.groupBy(
    turns.filter((turn) => turn.reply === undefined && !turn.frozenItems && !turn.error),
    (turn) => turn.sessionId
  )
  const reads = botChatReads(groups.runtime)
  const read = new Map<string, AgentJournalRenderItem[]>()
  for (const [sessionId, sessionTurns] of unsaved) {
    for (const [operationId, items] of await reads.turnItems(sessionId, sessionTurns)) {
      read.set(operationId, items)
    }
  }
  const completed = new Map<string, string>()
  for (const turn of turns) {
    const text =
      turn.reply === undefined
        ? botGroupCompletedText(turn.frozenItems ?? read.get(turn.operationId) ?? [])
        : turn.reply
    if (text) {
      completed.set(turn.operationId, text)
    }
  }
  // What a read settles is saved too, so the next post reads that chat no more: the reply, or null
  // for a turn that ended without one (stopped, failed). Saved on the message as it stands now: the
  // reads above may have let a turn's error or reply land on it.
  const settled = new Map<string, string | null>()
  for (const [operationId, items] of read) {
    const ended = items.some((item) => item.body.kind === 'turn' && item.body.state !== 'running')
    if (completed.has(operationId) || ended) {
      settled.set(operationId, completed.get(operationId) ?? null)
    }
  }
  const found = (turn: BotGroupTurn) => turn.reply === undefined && settled.has(turn.operationId)
  for (const { id } of messages) {
    const current = groups.store.message(id)
    if (current?.turns.some(found)) {
      groups.store.update({
        ...current,
        turns: current.turns.map((turn) =>
          found(turn) ? { ...turn, reply: settled.get(turn.operationId) } : turn
        )
      })
    }
  }
  return completed
}

export function assertGroupQueuedMessageAllowed(
  groups: BotGroupRuntime,
  sessionId: string,
  operationId: string
): void {
  if (!isBotGroupMemberSession(sessionId)) {
    return
  }
  const message = groups.store.operationMessage(operationId)
  const turn = message?.turns.find(
    (turn) => turn.operationId === operationId && turn.sessionId === sessionId
  )
  if (!message || !turn) {
    throw new Error('The original queued group request cannot be verified.')
  }
  try {
    assertTurnActive(groups, message, turn)
  } catch (error) {
    recordTurnError(groups, message.id, operationId, error)
    groups.changed()
    throw error
  }
}

/** At startup: a crash between reservation and native admission replays the same operation,
 *  never a fresh turn. */
export function resumePendingGroupDeliveries(groups: BotGroupRuntime): void {
  if (!groups.runtime.bots.enabled()) {
    return
  }
  for (const { message, turn } of groups.store.pending()) {
    if (turn.error || turn.retryAt !== undefined) {
      groups.deliveryQueue.hold(turn.sessionId, turn.operationId)
    }
    if ((turn.deliveryAttempts ?? 0) >= 3) {
      groups.deliveryQueue.hold(turn.sessionId, turn.operationId)
      continue
    }
    if (turn.retryAt !== undefined && turn.retryAt > Date.now()) {
      groups.retrySchedule.schedule(turn.operationId, turn.retryAt, () => groups.resumePending())
    } else {
      queueTurn(groups, message, turn)
    }
  }
}

export function retryBotGroupDelivery(
  groups: BotGroupRuntime,
  groupId: string,
  operationId: string
): void {
  const message = groups.store.operationMessage(operationId)
  const turn = message?.turns.find((turn) => turn.operationId === operationId)
  if (
    !message ||
    message.groupId !== groupId ||
    !turn ||
    !turn.retryable ||
    groups.store.pendingContext(operationId) === null
  ) {
    throw new Error('This delivery cannot be retried.')
  }
  if (groups.deliveries.has(operationId)) {
    return
  }
  assertTurnActive(groups, message, turn)
  updateTurnDelivery(groups, message.id, operationId, {
    deliveryAttempts: 0,
    error: undefined,
    retryAt: undefined,
    retryable: undefined
  })
  queueTurn(groups, message, turn)
  groups.changed()
}

function queueTurn(groups: BotGroupRuntime, message: BotGroupMessage, turn: BotGroupTurn): void {
  groups.deliveryQueue.enqueue({
    id: turn.operationId,
    sessionId: turn.sessionId,
    run: () => deliverTurn(groups, message, turn)
  })
}
