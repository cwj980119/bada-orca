import { defineFixture } from '../../component-fixtures/component-fixture'
import { stubBots } from '../../component-fixtures/fixture-bots'
import { setRendererUiLanguage } from '@/i18n/i18n'
import type { Bot } from '../../../../shared/bot-types'
import type { BotGroup } from '../../../../shared/bots/bot-group'
import { MonitorConversations } from './MonitorConversations'
import { mergeMonitorHosts } from './monitor-host-snapshot'
import { host, message } from './monitor-conversation.test-fixture'

const bots: Bot[] = ['총괄 봇', '검토 봇', '개발 봇', '문서 봇'].map((name, index) => ({
  id: `member-${index}`,
  name,
  hostId: 'local',
  agent: 'codex',
  avatar: `mascot:${['A1', 'B1', 'C1', 'D1'][index]}`,
  folder: `member-${index}`,
  folderWorkspaceId: `home-${index}`,
  chatSessionId: `chat-${index}`,
  paused: false,
  notifications: { needsPermission: true, taskComplete: true, couldNotFinish: true },
  members: [],
  slack: null,
  linear: null,
  github: null,
  createdAt: 1,
  updatedAt: 1
}))
const groups: BotGroup[] = [2, 3, 4].map((count) => ({
  id: `room-${count}`,
  name: `${count}인 개발 회의`,
  hostId: 'local',
  folder: `room-${count}`,
  folderWorkspaceId: `room-home-${count}`,
  createdAt: 1800000000000 - count,
  revision: 1,
  replyMode: { kind: 'all' },
  members: bots
    .slice(0, count)
    .map((bot) => ({ botId: bot.id, sessionId: `bot-group-member-${count}-${bot.id}` }))
}))
const groupHost = {
  ...host,
  snapshot: {
    ...host.snapshot!,
    participants: [
      ...host.snapshot!.participants,
      ...bots.map((bot) => ({
        id: `bot:${bot.id}`,
        address: `bot:${bot.id}`,
        name: bot.name,
        kind: 'bot' as const,
        avatar: bot.avatar,
        agent: bot.agent,
        model: null,
        executionHost: 'local',
        state: 'registered' as const,
        cwd: null
      }))
    ],
    messages: [
      ...host.snapshot!.messages,
      ...groups.flatMap((group) => [
        {
          ...message,
          id: `${group.id}-final`,
          conversationId: group.id,
          from: 'bot:member-1',
          to: 'bot:member-0',
          fromAddress: 'bot:member-1',
          toAddress: 'bot:member-0',
          subject: '검토 완료',
          preview: '수정 사항을 확인했습니다. 다음 단계로 진행해도 됩니다.',
          createdAt: '2026-11-22T05:02:00Z',
          task: null
        },
        {
          ...message,
          id: `${group.id}-first`,
          conversationId: group.id,
          from: 'bot:member-0',
          to: 'bot:member-1',
          fromAddress: 'bot:member-0',
          toAddress: 'bot:member-1',
          subject: '그룹 검토 요청',
          preview: '인증 처리 흐름을 함께 검토해 주세요.',
          createdAt: '2026-11-22T05:00:00Z',
          task: null
        },
        {
          ...message,
          id: `${group.id}-reply`,
          conversationId: group.id,
          from: 'bot:member-1',
          to: 'bot:member-0',
          fromAddress: 'bot:member-1',
          toAddress: 'bot:member-0',
          subject: '검토 의견',
          preview: '재연결 시 대기 중인 메시지의 처리 순서를 보완하면 좋겠습니다.',
          createdAt: '2026-11-22T05:01:00Z',
          task: null
        }
      ])
    ]
  }
}
function setup() {
  stubBots(bots)
  void setRendererUiLanguage('ko')
}
export const groupRooms = defineFixture({
  width: 1000,
  setup,
  render: () => (
    <MonitorConversations
      data={mergeMonitorHosts([groupHost])}
      bots={bots}
      groups={groups}
      onSelect={() => {}}
    />
  )
})
export const narrowGroupRooms = defineFixture({
  ...groupRooms,
  width: 420,
  interact: (frame) => {
    frame.querySelector<HTMLButtonElement>('nav button[aria-current]')?.click()
  }
})
