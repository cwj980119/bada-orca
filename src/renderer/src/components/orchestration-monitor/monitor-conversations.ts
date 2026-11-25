import { monitorKey, type MonitorData } from './monitor-host-snapshot'

export type MonitorConversation = {
  id: string
  participants: string[]
  messages: MonitorData['messages']
  group: boolean
}

export function monitorConversations(messages: MonitorData['messages']): MonitorConversation[] {
  const byId = new Map(messages.map((message) => [message.id, message]))
  const rootOf = (message: MonitorData['messages'][number]) => {
    const seen = new Set([message.id])
    let root = message
    while (root.threadId) {
      const parentId = monitorKey(root.host.id, root.threadId)
      if (seen.has(parentId)) {
        break
      }
      seen.add(parentId)
      const parent = byId.get(parentId)
      if (!parent) {
        return parentId
      }
      root = parent
    }
    return root.id
  }
  const threads = new Map<string, Set<string>>()
  const groups = new Map<string, string>()
  for (const message of messages) {
    const root = rootOf(message)
    const parties = threads.get(root) ?? new Set<string>()
    parties.add(message.from).add(message.to)
    threads.set(root, parties)
    if (message.conversationId) {
      groups.set(root, message.conversationId)
    }
  }
  const rooms = new Map<string, MonitorConversation>()
  for (const message of messages) {
    const root = rootOf(message)
    const groupId = groups.get(root)
    const group = Boolean(groupId) || threads.get(root)!.size > 2
    const id = groupId
      ? JSON.stringify(['group', message.host.id, groupId])
      : group
        ? JSON.stringify(['thread', root])
        : JSON.stringify(['direct', ...[message.from, message.to].sort()])
    const room = rooms.get(id) ?? { id, participants: [], messages: [], group }
    room.messages.push(message)
    room.participants = [...new Set([...room.participants, message.from, message.to])]
    rooms.set(id, room)
  }
  return [...rooms.values()]
    .map((room) => ({
      ...room,
      participants: room.participants.toSorted(),
      messages: room.messages.toSorted((a, b) => a.createdAt.localeCompare(b.createdAt))
    }))
    .sort((a, b) => b.messages.at(-1)!.createdAt.localeCompare(a.messages.at(-1)!.createdAt))
}
