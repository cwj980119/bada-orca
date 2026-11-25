import type {
  MonitorMessage,
  MonitorParticipant
} from '../../../../shared/orchestration/orchestration-monitor'
import type { OrcaRuntimeService } from '../../orca-runtime'
import { structuredMailboxCustody } from '../mailbox/routing/structured-session-mail-target'
import { getStructuredAgentSessionHost } from '../../../native-chat/agent-session-wire/host/structured-agent-session-registry'
import { botOfSession } from '../../../bots/bot-session-tabs'
import {
  readMonitorSessionExecution,
  type MonitorSessionExecution
} from './monitor-session-execution'
import { monitorRequestProgress } from './monitor-request-progress'
import { runIsClosed } from '../db/runs/run-controls'

export async function enrichMonitorExecution(
  runtime: OrcaRuntimeService,
  participants: MonitorParticipant[],
  messages: MonitorMessage[]
): Promise<void> {
  const db = runtime.getOrchestrationDb()
  const host = getStructuredAgentSessionHost()
  const targets = new Map(
    messages.map((message) => [message.id, structuredMailboxCustody(message.toAddress, db)])
  )
  const sessions = new Set(
    runtime.bots
      .list()
      .slice(0, 200)
      .flatMap((bot) => (bot.chatSessionId ? [bot.chatSessionId] : []))
  )
  for (const id of host?.loadedSessionIds?.() ?? []) {
    if (botOfSession(runtime.bots, id)) {
      sessions.add(id)
    }
  }
  for (const target of targets.values()) {
    if (typeof target === 'object') {
      sessions.add(target.sessionId)
    }
  }
  const facts = new Map<string, MonitorSessionExecution>()
  const ids = [...sessions]
  for (let offset = 0; offset < ids.length; offset += 4) {
    await Promise.all(
      ids
        .slice(offset, offset + 4)
        .map(async (id) => facts.set(id, await readMonitorSessionExecution(id)))
    )
  }
  const rank = [
    'approval',
    'starting',
    'working',
    'answer',
    'failed',
    'idle',
    'sleeping',
    'unavailable'
  ]
  for (const participant of participants.filter((item) => item.kind === 'bot')) {
    const botId = participant.address.slice(4)
    const executions = [...facts].flatMap(([id, value]) =>
      botOfSession(runtime.bots, id)?.id === botId ? [value.execution] : []
    )
    participant.execution =
      participant.state === 'paused'
        ? { state: 'paused', observedAt: new Date().toISOString() }
        : (executions.sort((a, b) => rank.indexOf(a.state) - rank.indexOf(b.state))[0] ?? {
            state: 'sleeping',
            observedAt: new Date().toISOString()
          })
  }
  for (const message of messages) {
    const request = db.getBotRequest(message.id)
    if (!request) {
      continue
    }
    const bot = runtime.bots.list().find((item) => item.id === request.to_bot_id)
    const target = targets.get(message.id)
    const session = typeof target === 'object' ? facts.get(target.sessionId) : undefined
    const execution = bot?.paused
      ? { state: 'paused' as const, observedAt: new Date().toISOString() }
      : (session?.execution ?? {
          state: 'unavailable' as const,
          observedAt: new Date().toISOString()
        })
    const attempt = db.getStructuredMailSend(message.toAddress, message.id)
    let answer:
      | 'unreadable'
      | Awaited<ReturnType<NonNullable<typeof host>['sendAnswer']>>['kind']
      | null = null
    if (attempt) {
      answer =
        (await host
          ?.sendAnswer(attempt.session_id, attempt.operation_id)
          .then((value) => value.kind)
          .catch(() => 'unreadable' as const)) ?? 'unreadable'
    }
    message.progress = monitorRequestProgress(
      message,
      {
        execution,
        failureHeld: session?.failureHeld ?? false,
        startupFailed: session?.startupFailed
      },
      answer
    )
    if (db.getOutstandingMailboxDelivery(message.toAddress)) {
      message.progress.actions = message.progress.actions.filter((action) => action !== 'cancel')
    }
    if (
      !attempt &&
      !message.outcome &&
      message.delivery === 'pending' &&
      runIsClosed(db, message.runId)
    ) {
      message.progress = {
        ...message.progress,
        stage: 'blocked',
        reason: 'run_stopped',
        attention: true,
        actions: message.progress.actions.filter((action) => action === 'cancel')
      }
    }
  }
}
