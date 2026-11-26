import type Database from '../sqlite/sync-database'
import type { BotGroupMessage } from '../../shared/bots/bot-group'

export class BotGroupMessageChanges {
  constructor(
    private readonly db: Database,
    private readonly decode: (row: Record<string, unknown>) => BotGroupMessage
  ) {
    db.exec(`CREATE TABLE IF NOT EXISTS bot_group_message_changes (
        change_sequence INTEGER PRIMARY KEY AUTOINCREMENT, group_id TEXT NOT NULL,
        thread_id TEXT NOT NULL, message_id TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS bot_group_room_changes
        ON bot_group_message_changes(group_id, thread_id, change_sequence);
      CREATE TRIGGER IF NOT EXISTS bot_group_message_inserted AFTER INSERT ON bot_group_messages
      BEGIN INSERT INTO bot_group_message_changes(group_id, thread_id, message_id)
        VALUES (new.group_id, coalesce(json_extract(new.record, '$.threadId'), ''), new.id); END;
      CREATE TRIGGER IF NOT EXISTS bot_group_message_updated AFTER UPDATE OF record ON bot_group_messages
      WHEN new.record != old.record
      BEGIN INSERT INTO bot_group_message_changes(group_id, thread_id, message_id)
        VALUES (new.group_id, coalesce(json_extract(new.record, '$.threadId'), ''), new.id); END;`)
  }

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
        `SELECT c.change_sequence, m.id, m.sequence, m.record FROM bot_group_message_changes c
       JOIN bot_group_messages m ON m.id = c.message_id
       WHERE c.group_id = ? AND c.thread_id = ? AND c.change_sequence > ?
       ORDER BY c.change_sequence LIMIT 201`
      )
      .all(groupId, threadId ?? '', after)
    const page = rows.slice(0, 200)
    const messages = [...new Map(page.map((row) => [String(row.id), row])).values()].map((row) =>
      this.decode(row)
    )
    return {
      cursor: Number(page.at(-1)?.change_sequence ?? after),
      hasMoreChanges: rows.length > 200,
      messages: messages.sort((left, right) => left.sequence - right.sequence)
    }
  }
}
