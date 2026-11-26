import { defineFixture } from '../../component-fixtures/component-fixture'
import { stubBots } from '../../component-fixtures/fixture-bots'
import { publishBotGroups } from '@/lib/bot-group-catalog-snapshot'
import { setRendererUiLanguage } from '@/i18n/i18n'
import type { Bot } from '../../../../shared/bot-types'
import type { BotGroup } from '../../../../shared/bots/bot-group'
import { MonitorConversations } from './MonitorConversations'
import { mergeMonitorHosts } from './monitor-host-snapshot'
import { host } from './monitor-conversation.test-fixture'

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
function setup() {
  stubBots(bots)
  publishBotGroups(groups)
  void setRendererUiLanguage('ko')
  const original = window.api.runtime.call
  window.api.runtime.call = async (request) => {
    const params = request.params
    const groupId =
      params && typeof params === 'object' && 'groupId' in params ? params.groupId : undefined
    const group = groups.find((group) => group.id === groupId) ?? groups[0]!
    const result =
      request.method === 'bots.groups.list'
        ? { groups }
        : request.method === 'bots.groups.read'
          ? {
              group,
              messages: [
                {
                  id: 'owner-message',
                  groupId: group.id,
                  sequence: 1,
                  author: { kind: 'owner' },
                  text: '오늘 구현할 내용을 같이 검토해 주세요.',
                  createdAt: 1800000000000,
                  turns: []
                }
              ],
              hasEarlier: false,
              cursor: 1
            }
          : request.method === 'agentSession.history'
            ? { ok: true, page: { items: [], hasOlder: false, hasNewer: false } }
            : request.method === 'agentSession.currentRequests'
              ? { requests: [] }
              : null
    return result
      ? { id: 'fixture', ok: true, result, _meta: { runtimeId: 'fixture' } }
      : original(request)
  }
}
export const groupRooms = defineFixture({
  width: 1000,
  setup,
  render: () => (
    <MonitorConversations
      data={mergeMonitorHosts([host])}
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
