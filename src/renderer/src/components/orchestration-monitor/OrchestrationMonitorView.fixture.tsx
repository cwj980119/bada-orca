import { defineFixture } from '../../component-fixtures/component-fixture'
import { setRendererUiLanguage } from '@/i18n/i18n'
import { OrchestrationMonitorView } from './OrchestrationMonitorView'
import type { MonitorHostSnapshot } from './monitor-host-snapshot'
import type {
  MonitorMessage,
  MonitorParticipant
} from '../../../../shared/orchestration/orchestration-monitor'

const participants: MonitorParticipant[] = [
  {
    id: 'bot:lead',
    address: 'bot:lead',
    name: '총괄 봇',
    kind: 'bot',
    avatar: 'mascot:A1',
    agent: 'codex',
    model: 'internal-code',
    executionHost: null,
    state: 'registered',
    cwd: null
  },
  {
    id: 'bot:review',
    address: 'bot:review',
    name: '검토 봇',
    kind: 'bot',
    avatar: 'mascot:B1',
    agent: 'opencode',
    model: 'internal-review',
    executionHost: null,
    state: 'registered',
    cwd: null
  },
  {
    id: 'term_local',
    address: 'term_local',
    name: '개발 터미널',
    kind: 'terminal',
    agent: 'opencode',
    model: null,
    executionHost: 'local',
    state: 'connected',
    cwd: 'C:/work/app'
  },
  {
    id: 'term_ssh',
    address: 'term_ssh',
    name: 'SSH 작업자',
    kind: 'terminal',
    agent: 'claude',
    model: null,
    executionHost: 'ssh:review-server',
    state: 'connected',
    cwd: '/srv/app'
  },
  {
    id: 'external:review',
    address: 'external:review',
    name: '외부 검토 CLI',
    kind: 'external',
    agent: 'claude',
    model: null,
    executionHost: null,
    state: 'offline',
    cwd: '/work/review'
  }
]
const message: MonitorMessage = {
  id: 'msg-review',
  from: 'bot:lead',
  to: 'bot:review',
  fromAddress: 'bot:lead',
  toAddress: 'bot:review',
  subject: 'MCP 연결 설정 검토 요청',
  preview: '서버별 MCP 연결 설정과 인증 처리 흐름을 검토해 주세요.',
  type: 'dispatch',
  priority: 'normal',
  createdAt: '2026-11-22T04:18:00Z',
  deliveredAt: '2026-11-22T04:18:01Z',
  delivery: 'read',
  question: null,
  outcome: null,
  threadId: null,
  runId: 'run-review',
  task: {
    id: 'task-review',
    title: 'MCP 연결 설정 검토',
    status: 'dispatched',
    dispatchStatus: 'dispatched'
  }
}
const host: MonitorHostSnapshot = {
  id: 'local',
  label: '내 컴퓨터',
  target: { kind: 'local' },
  state: 'ready',
  error: null,
  snapshot: {
    capturedAt: '2026-11-22T04:20:00Z',
    participants,
    messages: [
      {
        ...message,
        id: 'msg-answer',
        from: 'bot:review',
        to: 'bot:lead',
        fromAddress: 'bot:review',
        toAddress: 'bot:lead',
        subject: '검토 결과',
        preview: '인증 설정을 확인했습니다. 연결이 복구되면 대기 중인 요청부터 처리하면 됩니다.',
        createdAt: '2026-11-22T04:19:00Z',
        threadId: 'msg-review'
      },
      {
        ...message,
        id: 'msg-question',
        from: 'term_ssh',
        to: 'bot:lead',
        fromAddress: 'term_ssh',
        toAddress: 'bot:lead',
        subject: '배포 대상 확인',
        type: 'question',
        question: 'pending',
        preview: '검토 서버에서 테스트를 진행해도 될까요?',
        delivery: 'delivered'
      },
      {
        ...message,
        id: 'msg-offline',
        to: 'external:review',
        toAddress: 'external:review',
        subject: '검토 결과 요청',
        delivery: 'pending',
        deliveredAt: null,
        task: null
      },
      message,
      {
        ...message,
        id: 'msg-worker',
        to: 'term_local',
        toAddress: 'term_local',
        subject: '설정 화면 수정',
        type: 'status',
        delivery: 'read'
      }
    ],
    assignments: [
      { id: 'dispatch-review', from: 'bot:lead', to: 'bot:review', task: message.task! },
      {
        id: 'dispatch-ssh',
        from: 'bot:lead',
        to: 'term_ssh',
        task: {
          id: 'task-ssh',
          title: '서버 연결 검증',
          status: 'dispatched',
          dispatchStatus: 'dispatched'
        }
      }
    ],
    limits: { messages: false, assignments: false, participants: false },
    omittedTerminalHosts: []
  }
}

function setup(): void {
  void setRendererUiLanguage('ko')
  const original = window.api.runtime.call
  window.api.runtime.call = async (request) =>
    request.method === 'orchestration.monitorMessage'
      ? {
          id: 'fixture',
          ok: true,
          _meta: { runtimeId: 'fixture' },
          result: {
            message,
            body: '서버별 MCP 연결 설정과 인증 처리 흐름을 검토해 주세요.\n\n수신 확인 이후에도 작업은 진행 중입니다.',
            payload: '{"taskId":"task-review"}'
          }
        }
      : original(request)
}

function render(): React.JSX.Element {
  return (
    <div style={{ width: '100%', height: 960 }}>
      <OrchestrationMonitorView
        hosts={[host]}
        refreshing={false}
        onRefresh={() => {}}
        onBack={() => {}}
        onConfigure={() => {}}
      />
    </div>
  )
}

function showMap(frame: HTMLElement): void {
  const target = [...frame.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find((button) =>
    button.textContent?.includes('관계도')
  )
  if (!target) {
    throw new Error('Relationship tab missing')
  }
  target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
}

async function showConversations(frame: HTMLElement): Promise<void> {
  const target = [...frame.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
    (button) => button.textContent?.trim() === '대화'
  )
  if (!target) {
    throw new Error('Conversations tab missing')
  }
  target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  )
}

async function selectConversation(frame: HTMLElement): Promise<void> {
  await showConversations(frame)
  const target = frame.querySelectorAll<HTMLButtonElement>('nav button')[1]
  if (!target) {
    throw new Error('Conversation missing')
  }
  target.click()
}

export const conversations = defineFixture({
  width: 1200,
  setup,
  render,
  interact: showConversations
})
export const selectedConversation = defineFixture({
  width: 1200,
  setup,
  render,
  interact: selectConversation
})
export const mediumConversation = defineFixture({
  width: 820,
  setup,
  render,
  interact: selectConversation
})
export const conversationParticipant = defineFixture({
  width: 1100,
  setup,
  render,
  interact: async (frame) => {
    await showConversations(frame)
    const target = frame.querySelector<HTMLButtonElement>('article button')
    if (!target) {
      throw new Error('Conversation participant missing')
    }
    target.click()
  }
})
export const relationship = defineFixture({ width: 1200, setup, render, interact: showMap })
export const participant = defineFixture({
  width: 1200,
  setup,
  render: () => render(),
  interact: async (frame) => {
    showMap(frame)
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    )
    const target = [...frame.querySelectorAll('button')].find(
      (button) => button.textContent?.includes('SSH 작업자') && button.hasAttribute('aria-pressed')
    )
    target?.click()
    if (!target) {
      throw new Error('SSH participant missing')
    }
  }
})
export const originalMessage = defineFixture({
  width: 1200,
  setup,
  render: () => render(),
  interact: async (frame) => {
    await showConversations(frame)
    const target = frame.querySelector<HTMLButtonElement>('article button[aria-expanded]')
    target?.click()
    if (!target) {
      throw new Error('Message missing')
    }
  }
})
export const narrow = defineFixture({ width: 420, setup, render: () => render() })
export const narrowConversation = defineFixture({
  width: 420,
  setup,
  render,
  interact: selectConversation
})
export const narrowConversationList = defineFixture({
  width: 420,
  setup,
  render,
  interact: showConversations
})
export const narrowConversationBack = defineFixture({
  width: 420,
  setup,
  render,
  interact: async (frame) => {
    await selectConversation(frame)
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    )
    const target = frame.querySelector<HTMLButtonElement>('section header button')
    if (!target) {
      throw new Error('Conversation back button missing')
    }
    target.click()
  }
})
export const groupConversation = defineFixture({
  width: 1200,
  interact: showConversations,
  setup,
  render: () => (
    <div className="h-[960px]">
      <OrchestrationMonitorView
        hosts={[
          {
            ...host,
            snapshot: {
              ...host.snapshot!,
              messages: [
                { ...message, conversationId: 'group-review' },
                {
                  ...message,
                  id: 'group-peer',
                  from: 'bot:review',
                  to: 'term_ssh',
                  conversationId: 'group-review',
                  subject: '서버 연결 확인 요청',
                  preview: 'SSH 호스트에서도 같은 인증 설정으로 연결되는지 확인해 주세요.',
                  createdAt: '2026-11-22T04:19:00Z'
                },
                {
                  ...message,
                  id: 'group-reply',
                  from: 'term_ssh',
                  to: 'bot:review',
                  threadId: 'group-peer',
                  subject: '서버 검증 완료',
                  preview: '원격 호스트에서도 연결과 요청 처리가 정상적으로 동작합니다.',
                  createdAt: '2026-11-22T04:20:00Z'
                }
              ]
            }
          }
        ]}
        refreshing={false}
        onRefresh={() => {}}
        onBack={() => {}}
        onConfigure={() => {}}
      />
    </div>
  )
})
export const empty = defineFixture({
  width: 1100,
  setup,
  render: () => (
    <div className="h-[720px]">
      <OrchestrationMonitorView
        hosts={[
          {
            ...host,
            snapshot: { ...host.snapshot!, participants: [], messages: [], assignments: [] }
          }
        ]}
        refreshing={false}
        onRefresh={() => {}}
        onBack={() => {}}
        onConfigure={() => {}}
      />
    </div>
  )
})
