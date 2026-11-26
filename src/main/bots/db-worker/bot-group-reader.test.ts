import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import Database from '../../sqlite/sync-database'
import { BotGroupStore } from '../bot-group-store'
import { BotsDbWorkerClient } from './bots-db-worker-client'
import { inProcessBotsDbWorker } from './bots-db-worker.test-fixture'
import { closeBotsDbStores } from './bots-db-worker-entry'

it('reads committed room deltas through the background DB transport', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'orca-group-reader-'))
  const path = join(dir, 'rooms.sqlite')
  const db = new Database(path)
  const store = new BotGroupStore(db)
  const { factory } = inProcessBotsDbWorker()
  const client = new BotsDbWorkerClient(factory)
  try {
    store.put({
      id: 'review',
      name: 'Review',
      hostId: 'local',
      revision: 1,
      folder: 'review',
      folderWorkspaceId: 'home',
      createdAt: 1,
      members: [],
      replyMode: { kind: 'all' }
    })
    const post = store.append({
      id: 'plan',
      groupId: 'review',
      author: { kind: 'owner' },
      text: 'Original plan',
      createdAt: 1,
      turns: []
    })
    const initial = await client.call('groups', path, 'read', [{ groupId: 'review' }])
    expect(initial).toMatchObject({
      cursor: 1,
      delta: false,
      messages: [{ id: 'plan', text: 'Original plan' }]
    })
    store.update({ ...post, text: 'Reviewed plan' })
    expect(
      await client.call('groups', path, 'read', [
        { groupId: 'review', afterChange: 1, revision: 1 }
      ])
    ).toMatchObject({
      cursor: 2,
      delta: true,
      hasMoreChanges: false,
      messages: [{ id: 'plan', text: 'Reviewed plan' }]
    })
    expect(
      await client.call('groups', path, 'read', [
        { groupId: 'review', afterChange: 2, revision: 1 }
      ])
    ).toMatchObject({ messages: [] })
  } finally {
    client.dispose()
    closeBotsDbStores()
    db.close()
    rmSync(dir, { recursive: true, force: true })
  }
})
