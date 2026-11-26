import type { z } from 'zod'
import type { BotGroupRead, BotGroupMessage } from '../../shared/bots/bot-group'
import type { BotGroupRuntime } from './bot-group-runtime'

/** One room's latest page; its `group` carries that room's member sessions. */
export function readBotGroup(
  groups: BotGroupRuntime,
  groupId: string,
  beforeSequence?: number,
  threadId?: string,
  changes?: Pick<z.infer<typeof BotGroupRead>, 'afterChange' | 'revision'>
) {
  const group = groups.store.room(groupId, threadId)
  const cursor = groups.store.changes.cursor(groupId, threadId)
  if (
    changes?.afterChange !== undefined &&
    changes.revision === group.revision &&
    changes.afterChange <= cursor
  ) {
    const page = groups.store.changes.read(groupId, threadId, changes.afterChange)
    return {
      group,
      ...page,
      messages: visibleMessages(page.messages),
      delta: true,
      hasEarlier: false
    }
  }
  const messages = groups.store.roomMessages(groupId, threadId, 40, beforeSequence)
  return {
    group,
    cursor,
    delta: false,
    hasMoreChanges: false,
    // Saved replies feed later posts' context only; the room renders each turn from its chat.
    messages: visibleMessages(messages),
    hasEarlier:
      messages.length > 0 &&
      groups.store.roomMessages(groupId, threadId, 1, messages[0].sequence).length > 0
  }
}

function visibleMessages(messages: BotGroupMessage[]): BotGroupMessage[] {
  return messages.map((message) => ({
    ...message,
    turns: message.turns.map(({ reply: _reply, ...turn }) => turn)
  }))
}
