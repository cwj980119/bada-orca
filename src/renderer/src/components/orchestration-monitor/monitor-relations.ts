import type { MonitorData } from './monitor-host-snapshot'

export type MonitorRelation = {
  id: string
  from: string
  to: string
  messages: MonitorData['messages']
  assignments: MonitorData['assignments']
}

export function monitorRelations(data: MonitorData): MonitorRelation[] {
  const relations = new Map<string, MonitorRelation>()
  const relation = (from: string, to: string) => {
    const id = JSON.stringify([from, to])
    let value = relations.get(id)
    if (!value) {
      value = { id, from, to, messages: [], assignments: [] }
      relations.set(id, value)
    }
    return value
  }
  for (const message of data.messages) {
    relation(message.from, message.to).messages.push(message)
  }
  for (const assignment of data.assignments) {
    relation(assignment.from, assignment.to).assignments.push(assignment)
  }
  return [...relations.values()]
}

export function layoutMonitorGraph(
  participants: MonitorData['participants'],
  relations: MonitorRelation[],
  viewportWidth = 800
) {
  const neighbors = new Map(participants.map((participant) => [participant.id, new Set<string>()]))
  for (const relation of relations) {
    neighbors.get(relation.from)?.add(relation.to)
    neighbors.get(relation.to)?.add(relation.from)
  }
  const remaining = new Set(participants.map((participant) => participant.id))
  const columns: string[][] = []
  while (remaining.size) {
    const root = [...remaining].sort(
      (a, b) => (neighbors.get(b)?.size ?? 0) - (neighbors.get(a)?.size ?? 0)
    )[0]
    let frontier = [root]
    remaining.delete(root)
    let depth = 0
    while (frontier.length) {
      const column = Math.min(depth, 3)
      ;(columns[column] ??= []).push(...frontier)
      const next: string[] = []
      for (const id of frontier) {
        for (const neighbor of neighbors.get(id) ?? []) {
          if (remaining.delete(neighbor)) {
            next.push(neighbor)
          }
        }
      }
      frontier = next
      depth++
    }
  }
  if (viewportWidth < 620) {
    const width = Math.max(240, viewportWidth - 16)
    return {
      width,
      height: Math.max(440, participants.length * 116 + 64),
      positions: new Map(
        columns.flat().map((id, index) => [id, { x: (width - 192) / 2, y: 32 + index * 116 }])
      )
    }
  }
  const height = Math.max(440, ...columns.map((column) => column.length * 116 + 64))
  const width = Math.max(800, columns.length * 252 + 40)
  const positions = new Map<string, { x: number; y: number }>()
  for (const [index, column] of columns.entries()) {
    for (const [row, id] of column.entries()) {
      positions.set(id, {
        x: (width - (columns.length - 1) * 252 - 192) / 2 + index * 252,
        y: (height - column.length * 116) / 2 + row * 116
      })
    }
  }
  return { positions, width, height }
}
