import { useEffect, useState } from 'react'
import { callRuntimeRpc } from '@/runtime/rpc/calls/runtime-rpc-call'
import { RuntimeRpcCallError } from '@/runtime/rpc/calls/runtime-rpc-result'
import { useTranslate, type Translate } from '@/i18n/use-translate'
import type {
  MonitorWorkDetail,
  MonitorWorksResult
} from '../../../../shared/orchestration/orchestration-work-monitor'
import type { MonitorHostSnapshot } from './monitor-host-snapshot'

export type HostedMonitorWork = MonitorWorksResult['works'][number] & { host: MonitorHostSnapshot }
export type MonitorWorkSelection = { hostId: string; runId: string } | null

function readError(t: Translate, error: unknown): string {
  return error instanceof RuntimeRpcCallError &&
    ['unknown_method', 'method_not_found'].includes(error.code)
    ? t(
        'orchestrationMonitor.work.unsupported',
        'This host needs an Orca update to support work tracking.'
      )
    : error instanceof Error
      ? error.message
      : String(error)
}

export function useMonitorWorks(
  hosts: readonly MonitorHostSnapshot[],
  selection: MonitorWorkSelection
) {
  const t = useTranslate()
  const [works, setWorks] = useState<HostedMonitorWork[]>([])
  const [loadedDetail, setDetail] = useState<{ key: string; value: MonitorWorkDetail } | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [limited, setLimited] = useState(false)
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setErrors([])
    void Promise.all(
      hosts.map(async (host) => {
        if (host.state !== 'ready') {
          return { host, data: null, error: host.error ?? host.state }
        }
        try {
          const data = await callRuntimeRpc<MonitorWorksResult>(
            host.target,
            'orchestration.monitorWorks',
            {},
            {
              signal: controller.signal,
              timeoutMs: 15_000,
              suppressFeatureInteraction: true
            }
          )
          return { host, data, error: null }
        } catch (error) {
          return { host, data: null, error: readError(t, error) }
        }
      })
    ).then((results) => {
      if (controller.signal.aborted) {
        return
      }
      setWorks(
        results.flatMap(({ host, data }) => (data?.works ?? []).map((work) => ({ ...work, host })))
      )
      setLimited(results.some(({ data }) => data?.limited))
      setErrors(results.flatMap(({ host, error }) => (error ? [`${host.label}: ${error}`] : [])))
      setLoading(false)
    })
    return () => controller.abort()
  }, [hosts, version, t])
  const host = hosts.find((candidate) => candidate.id === selection?.hostId)
  const runId = selection?.runId
  const detailKey = JSON.stringify([host?.id, runId])
  useEffect(() => {
    const controller = new AbortController()
    if (host?.state === 'ready' && runId) {
      void callRuntimeRpc<MonitorWorkDetail>(
        host.target,
        'orchestration.monitorWork',
        { runId },
        {
          signal: controller.signal,
          timeoutMs: 15_000,
          suppressFeatureInteraction: true
        }
      )
        .then((result) => {
          if (!controller.signal.aborted) {
            setDetail({ key: detailKey, value: result })
          }
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            setErrors((previous) => [...previous, readError(t, error)])
          }
        })
    }
    return () => controller.abort()
  }, [host, runId, version, detailKey, t])
  const detail =
    host?.state === 'ready' && loadedDetail?.key === detailKey ? loadedDetail.value : null
  return {
    works,
    detail,
    errors,
    loading,
    limited,
    refresh: () => setVersion((current) => current + 1)
  }
}
