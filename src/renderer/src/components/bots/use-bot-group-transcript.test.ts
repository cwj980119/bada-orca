// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { emitBotsChangedWindowEvent } from '@/lib/bots-changed-window-event'
import { callBotRpc } from '@/lib/bot-hosts'
import type { BotGroupTranscript } from '../../../../shared/bots/bot-group-transcript'
import { useBotGroupTranscript } from './use-bot-group-transcript'

vi.mock('@/lib/bot-hosts', () => ({ callBotRpc: vi.fn() }))

it('keeps the initial history when a change arrives during its read', async () => {
  const initial = Promise.withResolvers<BotGroupTranscript>()
  const followup = Promise.withResolvers<BotGroupTranscript>()
  vi.mocked(callBotRpc).mockReturnValueOnce(initial.promise).mockReturnValueOnce(followup.promise)
  const group: BotGroupTranscript['group'] = {
    id: 'review',
    name: 'Review',
    hostId: 'local',
    revision: 1,
    folder: 'review',
    folderWorkspaceId: 'review-home',
    createdAt: 1,
    members: [],
    replyMode: { kind: 'all' }
  }
  const first: BotGroupTranscript = {
    group,
    cursor: 1,
    hasEarlier: true,
    messages: [
      {
        id: 'plan',
        groupId: 'review',
        sequence: 10,
        author: { kind: 'owner' },
        text: 'Review the plan',
        createdAt: 1,
        turns: []
      }
    ]
  }
  const error = vi.fn()
  const { result, unmount } = renderHook(() => useBotGroupTranscript(group, undefined, true, error))
  await act(async () => {
    emitBotsChangedWindowEvent('local')
    initial.resolve(first)
    await initial.promise
  })
  expect(result.current.data?.messages.map((message) => message.text)).toEqual(['Review the plan'])
  await act(async () => {
    followup.resolve({
      group,
      cursor: 2,
      delta: true,
      hasEarlier: false,
      messages: [
        {
          id: 'approval',
          groupId: 'review',
          sequence: 11,
          author: { kind: 'owner' },
          text: 'Ship it',
          createdAt: 2,
          turns: []
        }
      ]
    })
    await followup.promise
  })
  expect(result.current.data?.messages.map((message) => message.text)).toEqual([
    'Review the plan',
    'Ship it'
  ])
  expect(result.current.data?.hasEarlier).toBe(true)
  unmount()
  vi.mocked(callBotRpc).mockReset()
})
