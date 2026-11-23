import { useEffect, useRef, useState } from 'react'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { SettingsGroup } from '../section-layout/SettingsGroup'
import { useTranslate } from '@/i18n/use-translate'
import { callRuntimeRpc } from '@/runtime/rpc/calls/runtime-rpc-call'
import {
  SshClaudeDiagnosticStart,
  sshClaudeDiagnosticReport,
  type SshClaudeDiagnosticResult
} from '../../../../../shared/intranet/ssh-claude-diagnostic'
import { SshClaudeDiagnosticResultView } from './SshClaudeDiagnosticResultView'
import { SshClaudeConnectionFields } from './SshClaudeConnectionFields'

export function SshClaudeDiagnostic(): React.JSX.Element {
  const t = useTranslate()
  const [destination, setDestination] = useState('')
  const [password, setPassword] = useState('')
  const [directory, setDirectory] = useState('')
  const [executable, setExecutable] = useState('claude')
  const [timeoutSeconds, setTimeoutSeconds] = useState(60)
  const [result, setResult] = useState<SshClaudeDiagnosticResult | null>(null)
  const [starting, setStarting] = useState(false)
  const [ready, setReady] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const mounted = useRef(true)
  const activeId = useRef<string | null>(null)
  const active = result?.state === 'running' || result?.state === 'cancelling'
  const busy = starting || active
  const input = SshClaudeDiagnosticStart.safeParse({
    destination,
    directory,
    executable,
    timeoutSeconds,
    password: password || undefined
  })

  useEffect(() => {
    mounted.current = true
    let disposed = false
    void callRuntimeRpc<SshClaudeDiagnosticResult | null>(
      { kind: 'local' },
      'intranet.sshClaudeCurrent',
      undefined
    )
      .then((current) => {
        if (disposed || !current) {
          return
        }
        activeId.current =
          current.state === 'running' || current.state === 'cancelling' ? current.id : null
        setResult(current)
      })
      .catch(() => {})
      .finally(() => {
        if (!disposed) {
          setReady(true)
        }
      })
    return () => {
      disposed = true
      mounted.current = false
      if (activeId.current) {
        void callRuntimeRpc({ kind: 'local' }, 'intranet.sshClaudeCancel', {
          id: activeId.current
        }).catch(() => {})
      }
    }
  }, [])

  const id = result?.id
  useEffect(() => {
    if (!id || !active) {
      return
    }
    let disposed = false
    let timer: ReturnType<typeof setTimeout>
    const abort = new AbortController()
    const deadline = Date.now() + 5 * 60_000
    const poll = async (): Promise<void> => {
      try {
        const next = await callRuntimeRpc<SshClaudeDiagnosticResult>(
          { kind: 'local' },
          'intranet.sshClaudeStatus',
          { id },
          { signal: abort.signal }
        )
        if (disposed) {
          return
        }
        setResult(next)
        setUnavailable(false)
        if (next.state !== 'running' && next.state !== 'cancelling') {
          activeId.current = null
          return
        }
      } catch {
        if (disposed) {
          return
        }
        setUnavailable(true)
      }
      if (Date.now() < deadline) {
        timer = setTimeout(() => void poll(), 1000)
      }
    }
    timer = setTimeout(() => void poll(), 500)
    return () => {
      disposed = true
      clearTimeout(timer)
      abort.abort()
    }
  }, [id, active])

  const start = async (): Promise<void> => {
    if (!input.success || busy || !ready) {
      return
    }
    setStarting(true)
    setUnavailable(false)
    setCopyState('idle')
    setPassword('')
    try {
      const next = await callRuntimeRpc<SshClaudeDiagnosticResult>(
        { kind: 'local' },
        'intranet.sshClaudeStart',
        input.data
      )
      if (!mounted.current) {
        void callRuntimeRpc({ kind: 'local' }, 'intranet.sshClaudeCancel', { id: next.id }).catch(
          () => {}
        )
        return
      }
      activeId.current = next.state === 'running' ? next.id : null
      setResult(next)
    } catch {
      if (mounted.current) {
        setUnavailable(true)
      }
    } finally {
      if (mounted.current) {
        setStarting(false)
      }
    }
  }
  const cancel = async (): Promise<void> => {
    if (!result || !active) {
      return
    }
    try {
      const next = await callRuntimeRpc<SshClaudeDiagnosticResult>(
        { kind: 'local' },
        'intranet.sshClaudeCancel',
        { id: result.id }
      )
      if (mounted.current) {
        setResult(next)
      }
    } catch {
      if (mounted.current) {
        setUnavailable(true)
      }
    }
  }
  const copy = async (): Promise<void> => {
    if (!result) {
      return
    }
    try {
      await navigator.clipboard.writeText(sshClaudeDiagnosticReport(result))
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }
  return (
    <SettingsGroup
      title={t('intranet.sshClaude.title', 'SSH Claude connection test')}
      description={t(
        'intranet.sshClaude.description',
        'Test the existing Claude CLI on a Linux server without installing Orca there. This does not enable a remote bot or group chat.'
      )}
    >
      <div data-settings-row="" className="space-y-4 py-4">
        <p className="text-settings-detail text-muted-foreground">
          {t(
            'intranet.sshClaude.requirements',
            'Uses this PC’s OpenSSH configuration. Enter an optional SSH password below. The test sends two small model requests with tools disabled; Claude saves its own conversation history. No project files are edited or Orca files uploaded.'
          )}
        </p>
        <SshClaudeConnectionFields
          destination={destination}
          password={password}
          disabled={busy}
          onDestinationChange={setDestination}
          onPasswordChange={setPassword}
        />
        <div className="space-y-2">
          <Label htmlFor="ssh-claude-directory">
            {t('intranet.sshClaude.directory', 'Linux project directory (absolute path)')}
          </Label>
          <Input
            id="ssh-claude-directory"
            value={directory}
            disabled={busy}
            placeholder={t('intranet.sshClaude.directoryPlaceholder', '/home/user/project')}
            autoComplete="off"
            onChange={(event) => setDirectory(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ssh-claude-executable">
            {t('intranet.sshClaude.executable', 'Claude executable or absolute path')}
          </Label>
          <Input
            id="ssh-claude-executable"
            value={executable}
            disabled={busy}
            autoComplete="off"
            onChange={(event) => setExecutable(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ssh-claude-timeout">
            {t('intranet.sshClaude.timeout', 'Time limit per Claude request (20–120 seconds)')}
          </Label>
          <Input
            id="ssh-claude-timeout"
            type="number"
            min={20}
            max={120}
            value={timeoutSeconds}
            disabled={busy}
            onChange={(event) => setTimeoutSeconds(Number(event.target.value))}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy || !ready || !input.success}
            onClick={() => void start()}
          >
            {busy
              ? t('intranet.sshClaude.testing', 'Testing…')
              : t('intranet.sshClaude.start', 'Test connection')}
          </Button>
          {active ? (
            <Button
              type="button"
              variant="ghost"
              disabled={result?.state === 'cancelling'}
              onClick={() => void cancel()}
            >
              {t('intranet.sshClaude.cancel', 'Cancel test')}
            </Button>
          ) : null}
          {result ? (
            <Button type="button" variant="ghost" onClick={() => void copy()}>
              {t('intranet.sshClaude.copy', 'Copy diagnostic result')}
            </Button>
          ) : null}
        </div>
        {unavailable ? (
          <p role="alert" className="text-settings-detail text-destructive">
            {t(
              'intranet.sshClaude.unavailable',
              'Could not reach the diagnostic service. Another test may still be running. Reopen this page or restart Orca before trying again.'
            )}
          </p>
        ) : null}
        {result ? <SshClaudeDiagnosticResultView result={result} /> : null}
        {copyState !== 'idle' ? (
          <p role="status" className="text-settings-detail text-muted-foreground">
            {copyState === 'copied'
              ? t(
                  'intranet.sshClaude.copied',
                  'Copied statuses and version only. Host, paths, session IDs, and raw outputs are excluded.'
                )
              : t(
                  'intranet.sshClaude.copyFailed',
                  'Could not copy the diagnostic result. Try again.'
                )}
          </p>
        ) : null}
      </div>
    </SettingsGroup>
  )
}
