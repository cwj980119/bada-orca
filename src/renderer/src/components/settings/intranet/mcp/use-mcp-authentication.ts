import { useCallback, useEffect, useRef, useState } from 'react'
import { callRuntimeRpc } from '@/runtime/rpc/calls/runtime-rpc-call'
import {
  IntranetMcpServerSchema,
  type IntranetMcpServer
} from '../../../../../../shared/intranet/intranet-resources'
import type { IntranetMcpAuthStatus } from '../../../../../../shared/intranet/intranet-mcp-auth'

export function useMcpAuthentication(server: IntranetMcpServer) {
  const current = useRef(server)
  current.current = server
  const [status, setStatus] = useState<IntranetMcpAuthStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const live = useRef(false)
  const revision = JSON.stringify([
    server.id,
    server.transport,
    server.url,
    server.auth,
    server.tokenEnv
  ])
  const latest = useRef(revision)
  latest.current = revision
  const run = useCallback(async (method: string, secret?: string): Promise<boolean> => {
    const parsed = IntranetMcpServerSchema.safeParse(current.current)
    if (!parsed.success) {
      if (method !== 'mcpAuthStatus') {
        setError(parsed.error.issues[0]?.message ?? '연결 정보를 확인해 주세요.')
      }
      return false
    }
    const requested = latest.current
    const active = () => live.current && latest.current === requested
    if (method !== 'mcpAuthStatus') {
      setBusy(true)
      setError('')
    }
    try {
      const next = await callRuntimeRpc<IntranetMcpAuthStatus>(
        { kind: 'local' },
        `intranet.${method}`,
        { server: parsed.data, ...(secret !== undefined ? { secret } : {}) },
        { suppressFeatureInteraction: true }
      )
      if (active()) {
        setStatus(next)
      }
      return active()
    } catch {
      if (active() && method !== 'mcpAuthStatus') {
        setError(
          '인증 요청을 처리하지 못했습니다. 연결 정보와 보안 저장소, 호스트 환경변수를 확인해 주세요.'
        )
      }
      return false
    } finally {
      if (active()) {
        setBusy(false)
      }
    }
  }, [])
  useEffect(() => {
    live.current = true
    setStatus(null)
    setError('')
    setBusy(false)
    void run('mcpAuthStatus')
    return () => {
      live.current = false
    }
  }, [run, revision])
  useEffect(() => {
    if (status?.state !== 'authorizing') {
      return
    }
    const timer = setTimeout(() => {
      void run('mcpAuthStatus')
    }, 1000)
    return () => clearTimeout(timer)
  }, [run, status])
  return { status, busy, error, run }
}
