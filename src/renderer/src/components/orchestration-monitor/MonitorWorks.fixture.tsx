import { useState } from 'react'
import { defineFixture } from '../../component-fixtures/component-fixture'
import { setRendererUiLanguage } from '@/i18n/i18n'
import type {
  MonitorWork,
  MonitorWorkDetail,
  MonitorWorkTask
} from '../../../../shared/orchestration/orchestration-work-monitor'
import type { MonitorHostSnapshot } from './monitor-host-snapshot'
import type { MonitorWorkSelection } from './use-monitor-works'
import { MonitorWorksPanel } from './MonitorWorks'
import { MonitorWorkLimits } from './MonitorWorkLimits'
import { MonitorWorkerOutput } from './MonitorWorkerOutput'
import { OrchestrationMonitorView } from './OrchestrationMonitorView'

const host: MonitorHostSnapshot = {
  id: 'local',
  label: '내 컴퓨터',
  target: { kind: 'local' },
  state: 'ready',
  snapshot: null,
  error: null
}
const work: MonitorWork = {
  id: 'run_search_launch',
  objective: '사내 검색 개선 · 권한별 결과 필터와 응답 속도 최적화',
  coordinator: '총괄 봇',
  createdAt: '2026-11-25T06:00:00Z',
  updatedAt: '2026-11-25T07:20:00Z',
  tasks: { total: 3, completed: 1, failed: 0 },
  activeWorkers: 2,
  botRequests: 7,
  limits: {
    revision: 1,
    maxActiveWorkers: 3,
    maxBotRequests: 20,
    deadlineAt: '2026-11-25T09:00:00Z',
    stoppedAt: null,
    stopReason: null
  },
  stopOutcomes: []
}
const task: MonitorWorkTask = {
  id: 'task_search_api',
  parentId: null,
  title: '검색 API와 권한 필터 구현',
  spec: '검색 결과에 부서별 접근 권한을 반영하고, 반복 검색은 캐시를 사용해 응답 시간을 줄여 주세요.',
  specLimited: false,
  status: 'completed',
  dependencies: [],
  result:
    '검색 API와 권한 검증을 구현했습니다.\n\n변경 파일\n• src/search/access-filter.ts\n• src/search/result-cache.ts\n\n검증\n• 권한 없는 문서가 검색 결과에 포함되지 않는 회귀 테스트 통과\n• 캐시 만료 후 새 결과를 반환하는 테스트 통과\n\n다음 작업\n리뷰 봇과 테스트 봇이 변경 사항을 확인하고 있습니다.',
  resultLimited: false,
  createdAt: '2026-11-25T06:02:00Z',
  completedAt: '2026-11-25T06:54:00Z',
  attempts: [
    {
      id: 'ctx_search_api',
      creatorId: null,
      assignee: 'term_search',
      status: 'completed',
      workerState: 'succeeded',
      host: null,
      startedAt: '2026-11-25T06:02:00Z',
      completedAt: '2026-11-25T06:54:00Z',
      error: null,
      participant: {
        id: 'bot:dev',
        address: 'bot:dev',
        name: '개발 봇',
        avatar: 'mascot:A1',
        kind: 'bot',
        agent: 'codex',
        model: null,
        executionHost: null,
        state: 'registered',
        cwd: null
      }
    }
  ]
}
const detail: MonitorWorkDetail = {
  work,
  tasksLimited: false,
  attemptsLimited: false,
  tasks: [
    task,
    {
      ...task,
      id: 'task_search_review',
      parentId: task.id,
      title: '권한 경계와 캐시 정책 리뷰',
      spec: '권한 상승과 캐시 무효화 조건을 중심으로 검토해 주세요.',
      status: 'dispatched',
      dependencies: [task.id],
      result: null,
      completedAt: null,
      attempts: [
        {
          ...task.attempts[0],
          id: 'ctx_search_review',
          creatorId: 'ctx_search_api',
          assignee: 'term_review',
          status: 'dispatched',
          workerState: 'ready',
          completedAt: null,
          participant: {
            ...task.attempts[0].participant!,
            id: 'bot:review',
            address: 'bot:review',
            name: '리뷰 봇',
            avatar: 'mascot:B1',
            agent: 'claude'
          }
        }
      ]
    },
    {
      ...task,
      id: 'task_search_test',
      parentId: task.id,
      title: '권한별 검색 회귀 테스트',
      spec: '여러 부서 계정으로 권한 필터와 캐시 만료 시나리오를 확인해 주세요.',
      status: 'dispatched',
      dependencies: [task.id],
      result: null,
      completedAt: null,
      attempts: [
        {
          ...task.attempts[0],
          id: 'ctx_search_test',
          assignee: 'term_test',
          creatorId: 'ctx_search_api',
          status: 'dispatched',
          workerState: 'ready',
          host: '서울 개발 서버',
          completedAt: null,
          participant: {
            ...task.attempts[0].participant!,
            id: 'bot:test',
            address: 'bot:test',
            name: '테스트 봇',
            avatar: 'mascot:D1'
          }
        }
      ]
    }
  ]
}

function setup(mode: 'normal' | 'error' | 'pending' = 'normal'): void {
  void setRendererUiLanguage('ko')
  const original = window.api.runtime.call
  window.api.runtime.call = async (request) => {
    if (
      ![
        'orchestration.monitorWorkLimits',
        'orchestration.monitorWorkStop',
        'orchestration.monitorWorks',
        'orchestration.monitorWork',
        'orchestration.workerRead'
      ].includes(request.method)
    ) {
      return original(request)
    }
    if (mode === 'error') {
      throw new Error('호스트 연결이 끊겼습니다. 저장 여부를 확인하려면 새로고침하세요.')
    }
    if (mode === 'pending') {
      return new Promise(() => {})
    }
    return {
      id: 'fixture',
      ok: true,
      _meta: { runtimeId: 'fixture' },
      result:
        request.method === 'orchestration.monitorWorks'
          ? { works: [work], limited: false }
          : request.method === 'orchestration.monitorWork'
            ? detail
            : request.method === 'orchestration.workerRead'
              ? {
                  source: 'terminal',
                  terminal: { tail: ['권한 필터 구현 완료', '검색 회귀 테스트 통과'] },
                  warnings: []
                }
              : {}
    }
  }
}

function Preview({
  initial = false,
  stopped = false,
  offline = false,
  empty = false
}: {
  initial?: boolean
  stopped?: boolean
  offline?: boolean
  empty?: boolean
}): React.JSX.Element {
  const [selection, setSelection] = useState<MonitorWorkSelection>(
    initial ? { hostId: 'local', runId: work.id } : null
  )
  const current = stopped
    ? {
        ...work,
        limits: {
          ...work.limits,
          revision: 2,
          stoppedAt: '2026-11-25T07:22:00Z',
          stopReason: 'user' as const
        },
        stopOutcomes: [
          { dispatchId: 'ctx_search_review', state: 'stopped' as const },
          {
            dispatchId: 'ctx_search_test',
            state: 'unconfirmed' as const,
            detail:
              '서울 개발 서버의 응답을 확인할 수 없습니다. 연결 복구 후 중지 상태를 다시 확인하세요.'
          }
        ]
      }
    : work
  const source: MonitorHostSnapshot = offline
    ? { ...host, state: 'offline', error: '호스트 연결 끊김' }
    : host
  return (
    <div className="@container/monitor bg-background p-4 text-foreground">
      <MonitorWorksPanel
        works={
          empty
            ? []
            : [
                { ...current, host: source },
                {
                  ...work,
                  id: 'run_docs',
                  objective: '신규 입사자를 위한 개발 환경 안내 정리',
                  tasks: { total: 4, completed: 4, failed: 0 },
                  activeWorkers: 0,
                  botRequests: 5,
                  host: source
                },
                {
                  ...work,
                  id: 'run_release',
                  objective: '릴리스 전 결제 경로 점검',
                  tasks: { total: 2, completed: 0, failed: 1 },
                  activeWorkers: 0,
                  botRequests: 3,
                  host: source
                }
              ]
        }
        detail={selection ? { ...detail, work: current } : null}
        host={source}
        errors={offline ? ['서울 개발 서버: 연결을 확인할 수 없습니다.'] : []}
        loading={false}
        limited={false}
        query=""
        selection={selection}
        onSelect={setSelection}
        onRefresh={() => {}}
        messages={[]}
        onOpenMessage={() => {}}
      />
    </div>
  )
}

function click(label: string) {
  return (frame: HTMLElement) => {
    const button = [...frame.querySelectorAll<HTMLButtonElement>('button')].find(
      (item) => item.textContent?.trim() === label
    )
    if (!button) {
      throw new Error(`Missing fixture action: ${label}`)
    }
    button.click()
  }
}

export const overview = defineFixture({ width: 1280, setup, render: () => <Preview /> })
export const tracking = defineFixture({ width: 1280, setup, render: () => <Preview initial /> })
export const narrow = defineFixture({ width: 420, setup, render: () => <Preview initial /> })
export const stopConfirm = defineFixture({
  width: 1280,
  setup,
  render: () => <Preview initial />,
  interact: click('작업 전체 중지')
})
export const stopUnconfirmed = defineFixture({
  width: 1280,
  setup,
  render: () => <Preview initial stopped />
})
export const offline = defineFixture({
  width: 420,
  setup,
  render: () => <Preview initial offline />
})
export const saving = defineFixture({
  width: 1280,
  setup: () => setup('pending'),
  render: () => <Preview initial />,
  interact: click('제한 저장')
})
export const saveFailed = defineFixture({
  width: 1280,
  setup: () => setup('error'),
  render: () => <Preview initial />,
  interact: click('제한 저장')
})
export const output = defineFixture({
  width: 1280,
  setup,
  render: () => <Preview initial />,
  interact: click('실행 기록 보기')
})
export const empty = defineFixture({ width: 420, setup, render: () => <Preview empty /> })

export const connected = defineFixture({
  width: 1280,
  setup,
  render: () => (
    <div className="h-[900px]">
      <OrchestrationMonitorView
        hosts={[
          {
            ...host,
            snapshot: {
              capturedAt: '2026-11-25T07:20:00Z',
              participants: [],
              messages: [],
              assignments: [],
              limits: { messages: false, assignments: false, participants: false },
              omittedTerminalHosts: []
            }
          }
        ]}
        refreshing={false}
        onRefresh={() => {}}
        onBack={() => {}}
        onConfigure={() => {}}
      />
    </div>
  ),
  interact: async (frame) => {
    const tab = [...frame.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (button) => button.textContent?.trim() === '작업 추적'
    )
    if (!tab) {
      throw new Error('Work tracking tab missing')
    }
    tab.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    )
    const card = [...frame.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.textContent?.includes(work.objective)
    )
    if (!card) {
      throw new Error('Work card did not load through the runtime bridge')
    }
    card.click()
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    )
  }
})

export const outputDetail = defineFixture({
  width: 600,
  setup,
  render: () => (
    <div className="bg-background p-4 text-foreground">
      <MonitorWorkerOutput dispatchId="ctx_search_api" label={task.title} host={host} />
    </div>
  ),
  interact: click('실행 기록 보기')
})

export const stopDetail = defineFixture({
  width: 420,
  setup,
  render: () => (
    <div className="bg-background p-4 text-foreground">
      <MonitorWorkLimits
        work={{
          ...work,
          limits: { ...work.limits, stoppedAt: '2026-11-25T07:22:00Z', stopReason: 'deadline' },
          stopOutcomes: [
            { dispatchId: 'ctx_search_review', state: 'stopped' },
            {
              dispatchId: 'ctx_search_test',
              state: 'unconfirmed',
              detail: '서울 개발 서버의 응답을 확인할 수 없습니다. 연결 복구 후 다시 확인하세요.'
            }
          ]
        }}
        host={host}
        onRefresh={() => {}}
      />
    </div>
  )
})
