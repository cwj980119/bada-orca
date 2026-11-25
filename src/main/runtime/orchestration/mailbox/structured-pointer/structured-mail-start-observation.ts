import type { StructuredAgentSessionHost } from '../../../../native-chat/agent-session-wire/host/structured-agent-session-host'

type StartObservation = {
  state: 'starting' | 'failed'
  at: string
  detail?: string
}

const observations = new WeakMap<StructuredAgentSessionHost, Map<string, StartObservation>>()

export function readMailStartObservation(
  host: StructuredAgentSessionHost,
  sessionId: string
): StartObservation | undefined {
  return observations.get(host)?.get(sessionId)
}

export function observeMailStart(host: StructuredAgentSessionHost, sessionId: string) {
  const sessions = observations.get(host) ?? new Map<string, StartObservation>()
  observations.set(host, sessions)
  const starting: StartObservation = { state: 'starting', at: new Date().toISOString() }
  sessions.set(sessionId, starting)
  return (failure?: string) => {
    if (sessions.get(sessionId) !== starting) {
      return
    }
    if (!failure) {
      sessions.delete(sessionId)
    } else {
      sessions.set(sessionId, {
        state: 'failed',
        at: new Date().toISOString(),
        detail: failure.slice(0, 1000)
      })
    }
    if (sessions.size > 200) {
      const oldestFailure = [...sessions].find(([, value]) => value.state === 'failed')
      if (oldestFailure) {
        sessions.delete(oldestFailure[0])
      }
    }
  }
}
