import { describe, expect, it } from 'vitest'
import { fixture } from './bot-group-native-runtime.test-fixture'

describe('group room changes', () => {
  it('returns edited earlier messages and new posts without mixing rooms', async () => {
    const { groups } = fixture()
    const group = await groups.create({ name: 'Review', botIds: ['bot-0'] })
    const post = groups.store.append({
      id: 'plan',
      groupId: group.id,
      author: { kind: 'owner' },
      text: 'Original plan',
      createdAt: 1,
      turns: []
    })
    const initial = groups.read(group.id)
    const { threadId } = await groups.newThread(group.id)
    groups.store.append({
      id: 'thread-post',
      groupId: group.id,
      threadId,
      author: { kind: 'owner' },
      text: 'Separate discussion',
      createdAt: 2,
      turns: []
    })
    groups.store.update({ ...post, text: 'Reviewed plan' })
    groups.store.append({
      id: 'follow-up',
      groupId: group.id,
      author: { kind: 'owner' },
      text: 'Ship it',
      createdAt: 3,
      turns: []
    })
    const changed = groups.read(group.id, undefined, undefined, {
      afterChange: initial.cursor,
      revision: group.revision
    })
    expect(changed.delta).toBe(true)
    expect(changed.messages.map(({ id, text }) => ({ id, text }))).toEqual([
      { id: 'plan', text: 'Reviewed plan' },
      { id: 'follow-up', text: 'Ship it' }
    ])
    expect(
      groups.read(group.id, undefined, undefined, {
        afterChange: changed.cursor,
        revision: group.revision
      }).messages
    ).toEqual([])
  })

  it('resets a stale membership cursor instead of retaining a removed member history', async () => {
    const { groups } = fixture()
    const group = await groups.create({ name: 'Review', botIds: ['bot-0', 'bot-1'] })
    const initial = groups.read(group.id)
    await groups.update({ groupId: group.id, revision: group.revision, botIds: ['bot-1'] })
    const changed = groups.read(group.id, undefined, undefined, {
      afterChange: initial.cursor,
      revision: group.revision
    })
    expect(changed.delta).toBe(false)
    expect(changed.group.members.map((member) => member.botId)).toEqual(['bot-1'])
  })

  it('rolls back both a post and its change event when admission fails', async () => {
    const { groups } = fixture()
    const group = await groups.create({ name: 'Review', botIds: ['bot-0'] })
    expect(() =>
      groups.store.transaction(() => {
        groups.store.append({
          id: 'rejected',
          groupId: group.id,
          author: { kind: 'owner' },
          text: 'Never accepted',
          createdAt: 1,
          turns: []
        })
        throw new Error('Admission refused')
      })
    ).toThrow('Admission refused')
    expect(groups.store.message('rejected')).toBeNull()
    expect(groups.read(group.id).cursor).toBe(0)
  })
})
