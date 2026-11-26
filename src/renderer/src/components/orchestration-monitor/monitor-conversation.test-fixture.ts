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
export const message: MonitorMessage = {
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
export const host: MonitorHostSnapshot = {
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
