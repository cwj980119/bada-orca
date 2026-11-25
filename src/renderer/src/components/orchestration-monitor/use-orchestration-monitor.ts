import { settleMonitorAction } from './settle-monitor-action'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { callRuntimeRpc } from '@/runtime/rpc/calls/runtime-rpc-call'
import { RuntimeRpcCallError } from '@/runtime/rpc/calls/runtime-rpc-result'
import { useAppStore } from '@/store'
import { getTranslatedExecutionHostLabel } from '@/runtime/hosts/display/execution-host-label'
import { useTranslate } from '@/i18n/use-translate'
import type { OrchestrationMonitorSnapshot } from '../../../../shared/orchestration/orchestration-monitor'
import type { MonitorHostSnapshot } from './monitor-host-snapshot'
import { monitorHostRevision, readMonitorHosts } from './monitor-hosts'

export function useOrchestrationMonitor() {
  const t = useTranslate()
  const revision = useSyncExternalStore(
    useAppStore.subscribe,
    monitorHostRevision,
    monitorHostRevision
  )
  const [refreshVersion, refresh] = useState(0)
  const [hosts, setHosts] = useState<MonitorHostSnapshot[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const retained = useRef(new Map<string, MonitorHostSnapshot & { identity: string }>())
  useEffect(() => {
    const controller = new AbortController()
    const descriptors = readMonitorHosts()
    const ids = descriptors.map((host) => host.id)
    const unavailable = new Set<string>()
    let timer: ReturnType<typeof setTimeout> | undefined
    let pending = false
    const publish = () => {
      if (!controller.signal.aborted) {
        setHosts(
          ids.flatMap((id) => {
            const host = retained.current.get(id)
            return host ? [host] : []
          })
        )
      }
    }
    for (const descriptor of descriptors) {
      const { id } = descriptor
      const previous = retained.current.get(id)
      const old =
        previous?.identity === descriptor.identity && !descriptor.revoked ? previous : null
      retained.current.set(id, {
        id,
        identity: descriptor.identity,
        label: descriptor.name ?? getTranslatedExecutionHostLabel(id, t),
        target: old?.target ?? descriptor.target,
        state: descriptor.available ? 'loading' : 'offline',
        snapshot: old?.snapshot ?? null,
        error: null
      })
    }
    publish()
    const tick = async () => {
      if (pending || controller.signal.aborted || document.hidden) {
        return
      }
      pending = true
      setRefreshing(true)
      await settleMonitorAction(
        async () => {
          for (let offset = 0; offset < ids.length; offset += 3) {
            await Promise.all(
              ids.slice(offset, offset + 3).map(async (id) => {
                if (
                  controller.signal.aborted ||
                  unavailable.has(id) ||
                  !descriptors.find((descriptor) => descriptor.id === id)?.available
                ) {
                  return
                }
                const host = retained.current.get(id)!
                try {
                  const snapshot = await callRuntimeRpc<OrchestrationMonitorSnapshot>(
                    host.target,
                    'orchestration.monitor',
                    {},
                    {
                      signal: controller.signal,
                      timeoutMs: 15_000,
                      suppressFeatureInteraction: true
                    }
                  )
                  if (!controller.signal.aborted) {
                    retained.current.set(id, { ...host, state: 'ready', snapshot, error: null })
                  }
                } catch (error) {
                  if (controller.signal.aborted) {
                    return
                  }
                  const unsupported =
                    error instanceof RuntimeRpcCallError &&
                    ['unknown_method', 'method_not_found'].includes(error.code)
                  if (unsupported) {
                    unavailable.add(id)
                  }
                  retained.current.set(id, {
                    ...host,
                    state: unsupported ? 'unsupported' : 'error',
                    error: error instanceof Error ? error.message : String(error)
                  })
                }
                publish()
              })
            )
          }
        },
        () => {
          pending = false
          if (!controller.signal.aborted) {
            setRefreshing(false)
            timer = setTimeout(() => void tick(), 5_000)
          }
        }
      )
    }
    const visible = () => {
      clearTimeout(timer)
      if (!document.hidden) {
        void tick()
      }
    }
    document.addEventListener('visibilitychange', visible)
    void tick()
    return () => {
      controller.abort()
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [revision, refreshVersion, t])
  return { hosts, refreshing, refresh: () => refresh((version) => version + 1) }
}
