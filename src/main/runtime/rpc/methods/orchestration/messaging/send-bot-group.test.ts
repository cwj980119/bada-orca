import '../../../dispatch/testing/unused-default-rpc-methods.test-fixture'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createOrchestrationRpcHarness } from '../rpc-test-harness'
import { runtimeBotGroups } from '../../../../../bots/bot-group-runtime'
import { makeTestBot } from '../../../../../bots/bot.test-fixture'
import { caller, journals, message, sessionsOf, setupBotMail } from './bot-recipient.test-fixture'
import type * as RecipientRouting from './recipient-routing'

vi.mock(
  '../../../../../bots/bot-session-tabs',
  async () => (await import('./bot-recipient.test-fixture')).botSessionTabsMock
)
vi.mock('../../../../../bots/bot-chat-session', async () => {
  const { botChatSessionMock: base } = await import('./bot-recipient.test-fixture')
  return {
    ...base,
    requireStructuredHost: async () => {
      const host = await base.requireStructuredHost()
      return {
        ...host,
        journalReads: async (id: string) => ({
          ...(await host.journalReads(id)),
          acceptedSendOfRow: async () => ({ clientMessageId: 'root-operation' })
        })
      }
    }
  }
})
vi.mock(
  '../../../../../bots/bot-chat-mail-hold',
  async () => (await import('./bot-recipient.test-fixture')).botChatMailHoldMock
)
vi.mock(
  '../../../../../bots/bot-chat-status-line',
  async () => (await import('./bot-recipient.test-fixture')).botChatStatusLineMock
)
vi.mock('./recipient-routing', async (original) =>
  (await import('./bot-recipient.test-fixture')).recipientRoutingMock(
    await original<typeof RecipientRouting>()
  )
)

const source = 'bot-group-member-11111111-1111-4111-8111-111111111111'
const docs = 'bot-group-member-22222222-2222-4222-8222-222222222222'
const sage = 'bot-group-member-33333333-3333-4333-8333-333333333333'

describe('CLI mail to a persistent group room', () => {
  const h = createOrchestrationRpcHarness()
  let mail: ReturnType<typeof setupBotMail>
  beforeEach(() => {
    mail = setupBotMail(h)
    sessionsOf.ranger.push(source)
    sessionsOf.docs.push(docs)
    sessionsOf.sage = [sage]
    mail.bots.push(makeTestBot({ id: 'sage', name: 'Sage' }))
    journals[source] = [message('group-instruction')]
    const groups = runtimeBotGroups(mail.runtime)
    groups.store.put({
      id: 'review-room',
      name: 'Review',
      hostId: 'local',
      revision: 1,
      folder: 'review',
      folderWorkspaceId: 'group-home',
      createdAt: 1,
      members: [
        { botId: 'ranger', sessionId: source },
        { botId: 'docs', sessionId: docs },
        { botId: 'sage', sessionId: sage }
      ],
      replyMode: { kind: 'all' }
    })
    groups.store.append({
      id: 'human-group',
      groupId: 'review-room',
      author: { kind: 'owner' },
      text: 'Review together',
      createdAt: 1,
      turns: [
        {
          operationId: 'root-operation',
          botId: 'ranger',
          botName: 'Ranger',
          avatar: null,
          agent: 'claude',
          sessionId: source
        }
      ]
    })
  })
  afterEach(() => {
    sessionsOf.ranger = sessionsOf.ranger.filter((id) => id !== source)
    sessionsOf.docs = sessionsOf.docs.filter((id) => id !== docs)
    delete sessionsOf.sage
    h.cleanup()
  })

  it('stores peer messages for the other members with verified room provenance', async () => {
    const result = await mail.sent(source, {
      to: 'group:review-room',
      type: 'question',
      body: 'Review the design'
    })
    expect(result.recipients).toBe(2)
    expect(result.messages.map((entry: { to_handle: string }) => entry.to_handle)).toEqual([
      `orca_session_id:${docs}`,
      `orca_session_id:${sage}`
    ])
    expect(JSON.parse(mail.db.getBotRequest(result.messages[0].id)!.record).group).toMatchObject({
      id: 'review-room',
      rootRequestId: 'human-group',
      sourceSessionId: source,
      targetSessionId: docs
    })
    const replay = await mail.sent(source, {
      to: 'group:review-room',
      type: 'question',
      body: 'Review the design'
    })
    expect(replay.messages.map((entry: { id: string }) => entry.id)).toEqual(
      result.messages.map((entry: { id: string }) => entry.id)
    )
  })

  it('keeps a healthy recipient deliverable when another member is paused', async () => {
    mail.bots[1].paused = true
    const result = await mail.sent(source, {
      to: 'group:review-room',
      type: 'status',
      body: 'Design ready'
    })
    expect(result.messages.map((entry: { to_handle: string }) => entry.to_handle)).toEqual([
      `orca_session_id:${sage}`
    ])
    expect(result.warnings.map((entry: { recipient: string }) => entry.recipient)).toEqual(['docs'])
  })

  it('rejects an outsider and a different room before fan-out', async () => {
    await expect(mail.send(source, { to: 'group:another-room', type: 'status' })).rejects.toThrow(
      /own group/
    )
    await expect(
      h.call(
        'orchestration.send',
        {
          from: caller('11111111-1111-4111-8111-111111111111').address,
          to: 'group:review-room',
          subject: 'Intrusion',
          type: 'status'
        },
        {
          runtime: mail.runtime,
          orchestrationCaller: caller('11111111-1111-4111-8111-111111111111')
        }
      )
    ).rejects.toThrow(/current member/)
  })
})
