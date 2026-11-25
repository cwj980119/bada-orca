import { defineFixture } from '../../component-fixtures/component-fixture'
import { setRendererUiLanguage } from '@/i18n/i18n'
import type {
  MonitorMessage,
  MonitorParticipant
} from '../../../../shared/orchestration/orchestration-monitor'
import type { MonitorHostSnapshot } from './monitor-host-snapshot'
import { OrchestrationMonitorView } from './OrchestrationMonitorView'

const at = '2026-11-25T07:20:00Z'
const participants: MonitorParticipant[] = [
  {
    id: 'bot:lead',
    address: 'bot:lead',
    name: '총괄 봇',
    kind: 'bot',
    agent: 'codex',
    model: 'internal-code',
    avatar: 'mascot:A1',
    executionHost: null,
    cwd: null,
    state: 'registered',
    execution: { state: 'working', observedAt: at }
  },
  {
    id: 'bot:review',
    address: 'bot:review',
    name: '코드 리뷰 봇',
    kind: 'bot',
    agent: 'opencode',
    model: 'internal-review',
    avatar: 'mascot:B1',
    executionHost: null,
    cwd: null,
    state: 'registered',
    execution: { state: 'failed', observedAt: at }
  },
  {
    id: 'bot:test',
    address: 'bot:test',
    name: '테스트 봇',
    kind: 'bot',
    agent: 'claude',
    model: null,
    avatar: 'mascot:D1',
    executionHost: null,
    cwd: null,
    state: 'registered',
    execution: { state: 'approval', observedAt: at }
  },
  {
    id: 'bot:docs',
    address: 'bot:docs',
    name: '문서 봇',
    kind: 'bot',
    agent: 'codex',
    model: null,
    avatar: 'mascot:G1',
    executionHost: null,
    cwd: null,
    state: 'registered',
    execution: { state: 'sleeping', observedAt: at }
  }
]
const base: MonitorMessage = {
  id: 'review-request',
  from: 'bot:lead',
  to: 'bot:review',
  fromAddress: 'bot:lead',
  toAddress: 'bot:review',
  subject: '인증 모듈 변경 사항을 검토해 주세요',
  preview: '세션 갱신 로직과 오류 복구 흐름을 확인하고, 수정이 필요한 부분을 정리해 주세요.',
  type: 'question',
  priority: 'normal',
  createdAt: '2026-11-25T07:08:00Z',
  deliveredAt: null,
  delivery: 'pending',
  question: null,
  outcome: null,
  threadId: null,
  runId: 'review-run',
  task: null,
  progress: {
    stage: 'failed',
    reason: 'startup_failed',
    actions: ['retry', 'cancel'],
    attention: true,
    since: '2026-11-25T07:08:00Z',
    detail: 'CLI startup timed out. Check the internal model server connection.'
  }
}
const requests: MonitorMessage[] = [
  base,
  {
    ...base,
    id: 'test-request',
    to: 'bot:test',
    toAddress: 'bot:test',
    subject: '변경된 로그인 흐름의 회귀 테스트',
    preview: '사내 테스트 환경에서 로그인과 세션 만료 시나리오를 확인해 주세요.',
    progress: {
      stage: 'blocked',
      reason: 'approval',
      actions: ['cancel'],
      attention: true,
      since: '2026-11-25T07:10:00Z'
    }
  },
  {
    ...base,
    id: 'docs-request',
    to: 'bot:docs',
    toAddress: 'bot:docs',
    subject: '연결 설정 문서 업데이트',
    preview: '기존 요청이 CLI에 전달되었는지 확인이 필요합니다.',
    delivery: 'delivered',
    deliveredAt: '2026-11-25T07:12:00Z',
    progress: {
      stage: 'uncertain',
      reason: 'uncertain',
      actions: [],
      attention: true,
      since: '2026-11-25T07:12:00Z'
    }
  }
]
const host: MonitorHostSnapshot = {
  id: 'local',
  label: '내 컴퓨터',
  target: { kind: 'local' },
  state: 'ready',
  error: null,
  snapshot: {
    capturedAt: at,
    participants,
    messages: requests,
    requests,
    assignments: [],
    limits: { messages: false, participants: false, assignments: false },
    omittedTerminalHosts: []
  }
}

function setup(mode: 'normal' | 'pending' | 'error' = 'normal'): void {
  void setRendererUiLanguage('ko')
  const original = window.api.runtime.call
  window.api.runtime.call = async (request) => {
    if (request.method !== 'orchestration.monitorRecover') {
      return original(request)
    }
    if (mode === 'pending') {
      return new Promise(() => {})
    }
    if (mode === 'error') {
      throw new Error('받는 봇의 상태가 변경되었습니다. 새로고침 후 다시 확인하세요.')
    }
    return {
      id: 'fixture',
      ok: true,
      result: { result: 'queued' },
      _meta: { runtimeId: 'fixture' }
    }
  }
}

function render(source = host): React.JSX.Element {
  return (
    <div className="h-[1150px]">
      <OrchestrationMonitorView
        hosts={[source]}
        refreshing={false}
        onRefresh={() => {}}
        onBack={() => {}}
        onConfigure={() => {}}
      />
    </div>
  )
}
function retry(frame: HTMLElement): void {
  const button = [...frame.querySelectorAll<HTMLButtonElement>('button')].find(
    (item) => item.textContent?.trim() === '다시 전달'
  )
  if (!button) {
    throw new Error('Retry action missing')
  }
  button.click()
}

export const overview = defineFixture({ width: 1280, setup, render: () => render() })
export const narrow = defineFixture({ width: 420, setup, render: () => render() })
export const retrying = defineFixture({
  width: 1280,
  setup: () => setup('pending'),
  render: () => render(),
  interact: retry
})
export const retryFailed = defineFixture({
  width: 1280,
  setup: () => setup('error'),
  render: () => render(),
  interact: retry
})
export const offline = defineFixture({
  width: 1280,
  setup,
  render: () => render({ ...host, state: 'offline' })
})
export const clear = defineFixture({
  width: 1280,
  setup,
  render: () => render({ ...host, snapshot: { ...host.snapshot!, requests: [], messages: [] } })
})
