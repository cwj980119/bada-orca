import type Database from '../sqlite/sync-database'
import type { BotGroupMessage } from '../../shared/bots/bot-group'

export class BotGroupMessageChanges {
  constructor(
    private readonly db: Database,
    private readonly decode: (row: Record<string, unknown>) => BotGroupMessage
  ) {}

  cursor(groupId: string, threadId?: string): number {
    const row = this.db
      .prepare(
        'SELECT coalesce(max(change_sequence), 0) AS cursor FROM bot_group_message_changes WHERE group_id = ? AND thread_id = ?'
      )
      .get(groupId, threadId ?? '')
    return Number(row?.cursor ?? 0)
  }

  read(groupId: string, threadId: string | undefined, after: number) {
    const rows = this.db
      .prepare(
        `SELECT change_sequence, message_id FROM bot_group_message_changes
       WHERE group_id = ? AND thread_id = ? AND change_sequence > ?
       ORDER BY change_sequence LIMIT 201`
      )
      .all(groupId, threadId ?? '', after)
    const page = rows.slice(0, 200)
    const read = this.db.prepare('SELECT sequence, record FROM bot_group_messages WHERE id = ?')
    const messages = [...new Set(page.map((row) => String(row.message_id)))].flatMap((id) => {
      const row = read.get(id)
      return row ? [this.decode(row)] : []
    })
    return {
      cursor: Number(page.at(-1)?.change_sequence ?? after),
      hasMoreChanges: rows.length > 200,
      messages: messages.sort((left, right) => left.sequence - right.sequence)
    }
  }
}
