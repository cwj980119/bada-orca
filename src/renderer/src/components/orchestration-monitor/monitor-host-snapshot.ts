import type { OrchestrationMonitorSnapshot } from '../../../../shared/orchestration/orchestration-monitor'
import type { ExecutionHostId } from '../../../../shared/execution-host/execution-host'
import type { RuntimeClientTarget } from '../../../../shared/remote-runtime/host-catalog/runtime-client-target'

export type MonitorHostSnapshot = {
  id: ExecutionHostId
  label: string
  target: RuntimeClientTarget
  state: 'loading' | 'ready' | 'offline' | 'unsupported' | 'error'
  snapshot: OrchestrationMonitorSnapshot | null
  error: string | null
}

export function monitorKey(hostId: string, id: string): string {
  return JSON.stringify([hostId, id])
}

export function mergeMonitorHosts(hosts: readonly MonitorHostSnapshot[]) {
  return {
    participants: hosts.flatMap((host) =>
      (host.snapshot?.participants ?? []).map((participant) => ({
        ...participant,
        id: monitorKey(host.id, participant.id),
        host,
        execution:
          host.state === 'ready'
            ? participant.execution
            : participant.execution
              ? { state: 'unavailable' as const, observedAt: participant.execution.observedAt }
              : undefined,
        state: host.state === 'ready' ? participant.state : ('unknown' as const)
      }))
    ),
    messages: hosts
      .flatMap((host) =>
        (host.snapshot?.messages ?? []).map((message) => ({
          ...message,
          rawId: message.id,
          id: monitorKey(host.id, message.id),
          host,
          from: monitorKey(host.id, message.from),
          to: monitorKey(host.id, message.to)
        }))
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    requests: hosts
      .flatMap((host) =>
        (host.snapshot?.requests ?? []).map((message) => ({
          ...message,
          rawId: message.id,
          id: monitorKey(host.id, message.id),
          host,
          from: monitorKey(host.id, message.from),
          to: monitorKey(host.id, message.to)
        }))
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    assignments: hosts.flatMap((host) =>
      (host.snapshot?.assignments ?? []).map((assignment) => ({
        ...assignment,
        id: monitorKey(host.id, assignment.id),
        host,
        from: monitorKey(host.id, assignment.from),
        to: monitorKey(host.id, assignment.to)
      }))
    )
  }
}

export type MonitorData = ReturnType<typeof mergeMonitorHosts>
export type MonitorSelection = { kind: 'participant' | 'message' | 'relation'; id: string } | null
