import { defineFixture } from '../../component-fixtures/component-fixture'
import { setRendererUiLanguage } from '@/i18n/i18n'
import { OrchestrationMonitorView } from './OrchestrationMonitorView'
import { host, message } from './monitor-conversation.test-fixture'

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
