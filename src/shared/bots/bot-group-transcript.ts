import type { BotGroup, BotGroupMessage } from './bot-group'

export type BotGroupTranscript = {
  group: BotGroup
  messages: BotGroupMessage[]
  hasEarlier: boolean
  cursor?: number
  delta?: boolean
  hasMoreChanges?: boolean
}

export type BotGroupTranscriptAction =
  /** The latest page from a read. */
  | { kind: 'recent'; page: BotGroupTranscript }
  /** An older page, loaded on request. */
  | { kind: 'earlier'; page: BotGroupTranscript }
  | { kind: 'sent'; message: BotGroupMessage }
  | { kind: 'group'; group: BotGroup }

function upsert(
  messages: readonly BotGroupMessage[],
  incoming: readonly BotGroupMessage[]
): BotGroupMessage[] {
  const byId = new Map(messages.map((message) => [message.id, message]))
  for (const message of incoming) {
    byId.set(message.id, message)
  }
  return [...byId.values()].sort((left, right) => left.sequence - right.sequence)
}

function sameMembers(left: BotGroup, right: BotGroup): boolean {
  const sessions = new Set(left.members.map((member) => member.sessionId))
  return (
    left.members.length === right.members.length &&
    right.members.every((member) => sessions.has(member.sessionId))
  )
}

/** How newer metadata lands: older revisions are stale, and a member change voids loaded rows. */
function acceptance(current: BotGroupTranscript, group: BotGroup): 'stale' | 'members' | 'same' {
  return group.revision < current.group.revision
    ? 'stale'
    : sameMembers(current.group, group)
      ? 'same'
      : 'members'
}

/** The one place a room's loaded transcript changes, shared by desktop and mobile. */
export function reduceBotGroupTranscript(
  current: BotGroupTranscript | null,
  action: BotGroupTranscriptAction
): BotGroupTranscript | null {
  if (!current) {
    return action.kind === 'recent' ? action.page : current
  }
  if (action.kind === 'sent') {
    return { ...current, messages: upsert(current.messages, [action.message]) }
  }
  const group = action.kind === 'group' ? action.group : action.page.group
  const accepted = acceptance(current, group)
  if (accepted === 'stale') {
    return current
  }
  switch (action.kind) {
    case 'recent': {
      const { page } = action
      if (page.delta && accepted === 'same') {
        if (
          page.cursor !== undefined &&
          current.cursor !== undefined &&
          page.cursor < current.cursor
        ) {
          return current
        }
        return {
          ...current,
          group,
          cursor: page.cursor,
          hasMoreChanges: page.hasMoreChanges,
          messages: upsert(current.messages, page.messages)
        }
      }
      // Older pages stay only while they still join the new page and no member left, since leaving rewrites their turns.
      const joins =
        page.messages.length === 0 ||
        current.messages.some((message) => message.id === page.messages[0].id)
      return accepted === 'same' && joins
        ? { ...current, ...page, messages: upsert(current.messages, page.messages) }
        : page
    }
    case 'earlier':
      return accepted === 'same'
        ? {
            ...current,
            hasEarlier: action.page.hasEarlier,
            messages: upsert(current.messages, action.page.messages)
          }
        : current
    case 'group':
      // A member change waits for the next read, which brings the rows that change rewrote.
      return accepted === 'same' ? { ...current, group } : current
  }
}
