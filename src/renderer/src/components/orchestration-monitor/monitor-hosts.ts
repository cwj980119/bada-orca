import { useAppStore } from '@/store'
import { runtimeHostConnectionStateForEntry } from '@/runtime/hosts/connections/runtime-host-connection-state'
import {
  toRuntimeExecutionHostId,
  type ExecutionHostId
} from '../../../../shared/execution-host/execution-host'
import type { RuntimeClientTarget } from '../../../../shared/remote-runtime/host-catalog/runtime-client-target'

export function readMonitorHosts(): {
  id: ExecutionHostId
  name: string | null
  target: RuntimeClientTarget
  available: boolean
  identity: string
  revoked: boolean
  version: string | null
}[] {
  const state = useAppStore.getState()
  return [
    {
      id: 'local',
      name: null,
      target: { kind: 'local' },
      available: true,
      identity: 'local',
      revoked: false,
      version: null
    },
    ...state.runtimeEnvironments.map((environment) => {
      const status = state.runtimeStatusByEnvironmentId.get(environment.id)
      const connection = runtimeHostConnectionStateForEntry(status)
      return {
        id: toRuntimeExecutionHostId(environment.id),
        name: environment.name,
        target: { kind: 'environment' as const, environmentId: environment.id },
        available: connection === 'connected' || connection === 'workspace-window-closed',
        identity: JSON.stringify([
          environment.pairingRevision,
          environment.hostKeyFingerprint,
          environment.runtimeId
        ]),
        revoked: status?.snapshot?.verification === 'blocked',
        version: status?.appVersion ?? null
      }
    })
  ]
}

export function monitorHostRevision(): string {
  return JSON.stringify(readMonitorHosts())
}
