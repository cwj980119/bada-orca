import Database from '../../sqlite/sync-database'
import { BotGroupStore } from '../bot-group-store'
import { BotGroupMessageChanges } from '../bot-group-message-changes'
import { readBotGroup } from '../bot-group-read'
import { BotGroupRead } from '../../../shared/bots/bot-group'

export function openBotGroupReader(path: string) {
  const db = new Database(path, { readonly: true, fileMustExist: true })
  const store = new BotGroupStore(db)
  const changes = new BotGroupMessageChanges(db, (row) => store.messageRow(row))
  return {
    call: (op: string, args: readonly unknown[]) => {
      if (op !== 'read') {
        return { found: false }
      }
      const input = BotGroupRead.parse(args[0])
      let value: ReturnType<typeof readBotGroup> | undefined
      store.transaction(() => {
        value = readBotGroup(
          { store, changes },
          input.groupId,
          input.beforeSequence,
          input.threadId,
          input
        )
      })
      return { found: true, value }
    },
    dispose: () => db.close()
  }
}
