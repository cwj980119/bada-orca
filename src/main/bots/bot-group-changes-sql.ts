export const BOT_GROUP_CHANGES_SQL = `CREATE TABLE IF NOT EXISTS bot_group_message_changes (
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
        VALUES (new.group_id, coalesce(json_extract(new.record, '$.threadId'), ''), new.id); END;`
