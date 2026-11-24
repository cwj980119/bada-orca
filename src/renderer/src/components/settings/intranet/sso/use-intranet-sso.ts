import { useCallback, useEffect, useRef, useState } from 'react'
import { callRuntimeRpc } from '@/runtime/rpc/calls/runtime-rpc-call'
import type { IntranetSsoStatus } from '../../../../../../shared/intranet/intranet-sso'

const LOCAL = { kind: 'local' } as const
export function useIntranetSso(revision: string) {
  const [status, setStatus] = useState<IntranetSsoStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const live = useRef(false)
  const run = useCallback(async (method: string, params: { clientSecret?: string } = {}) => {
    setBusy(true)
    setError(false)
    try {
      const next = await callRuntimeRpc<IntranetSsoStatus>(LOCAL, method, params, {
        suppressFeatureInteraction: true
      })
      if (live.current) {
        setStatus(next)
      }
    } catch {
      if (live.current) {
        setError(true)
      }
    } finally {
      if (live.current) {
        setBusy(false)
      }
    }
  }, [])
  useEffect(() => {
    live.current = true
    void run('intranet.ssoStatus')
    return () => {
      live.current = false
    }
  }, [run, revision])
  useEffect(() => {
    const wait =
      status?.state === 'authorizing'
        ? 1000
        : status?.state === 'signed-in' && status.identity
          ? Math.max(1000, status.identity.expiresAt - Date.now())
          : null
    if (wait === null) {
      return
    }
    const timer = setTimeout(() => void run('intranet.ssoStatus'), Math.min(wait, 24 * 60 * 60_000))
    return () => clearTimeout(timer)
  }, [status, run])
  return { status, busy, error, run }
}
