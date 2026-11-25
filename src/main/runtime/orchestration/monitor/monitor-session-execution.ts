import type { MonitorExecution } from '../../../../shared/orchestration/orchestration-monitor'
import { getStructuredAgentSessionHost } from '../../../native-chat/agent-session-wire/host/structured-agent-session-registry'
import { readMailStartObservation } from '../mailbox/structured-pointer/structured-mail-start-observation'

export type MonitorSessionExecution = {
  execution: MonitorExecution
  failureHeld: boolean
  startupFailed?: boolean
}

export async function readMonitorSessionExecution(
  sessionId: string
): Promise<MonitorSessionExecution> {
  const observedAt = new Date().toISOString()
  const unavailable: MonitorSessionExecution = {
    execution: { state: 'unavailable', observedAt },
    failureHeld: false
  }
  const host = getStructuredAgentSessionHost()
  if (!host?.deps.store.getConversation(sessionId)) {
    return unavailable
  }
  try {
    const work = await host.currentWorkAtRest(sessionId)
    const summary = host.readStatusSummary(sessionId)
    const start = readMailStartObservation(host, sessionId)
    const failureHeld = await (
      await host.conversation(sessionId)
    ).journal.queuedMessages.failureHolds()
    const prompt = work?.actionablePrompts()[0]
    let state: MonitorExecution['state'] = 'sleeping'
    if (start?.state === 'starting' || summary?.hostExecutionPhase === 'starting') {
      state = 'starting'
    } else if (prompt || summary?.status === 'attention') {
      state = prompt?.body.kind === 'question' ? 'answer' : 'approval'
    } else if (summary?.awaitsAnswer) {
      state = 'answer'
    } else if (work?.working()) {
      state = 'working'
    } else if (
      failureHeld ||
      (start?.state === 'failed' && !summary?.hostExecutionOwned) ||
      summary?.turnOutcome === 'failure'
    ) {
      state = 'failed'
    } else if (summary?.hostExecutionOwned) {
      state = 'idle'
    }
    return {
      execution: {
        state,
        observedAt,
        ...(state === 'failed' && start?.state === 'failed' ? { detail: start.detail } : {})
      },
      failureHeld,
      startupFailed: start?.state === 'failed'
    }
  } catch {
    return unavailable
  }
}
