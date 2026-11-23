import type { SshTarget } from '../../../shared/remote-runtime/ssh/ssh-types'
import type { SshClaudeConnectionObserver } from '../../../shared/intranet/ssh-claude-diagnostic'
import { SshClaudeDiagnosticFailure } from './ssh-claude-failure'
import {
  runSshClaudeConsole,
  spawnSshDiagnosticConsole,
  type SshDiagnosticConsole
} from './ssh-claude-console'
export { SshClaudeDiagnosticFailure } from './ssh-claude-failure'

export type SshDiagnosticReply = { stdout: string; code: number | null }
export type SshDiagnosticExecute = (
  command: string,
  timeoutMs: number,
  signal?: AbortSignal,
  observe?: (stdout: string) => void
) => Promise<SshDiagnosticReply>

export function sshDiagnosticTransport(
  target: SshTarget,
  password?: string,
  observeConnection: SshClaudeConnectionObserver = () => {}
): { execute: SshDiagnosticExecute; close: () => void } {
  const active = new Set<SshDiagnosticConsole>()
  let closed = false
  const destination =
    target.configHost || (target.username ? `${target.username}@${target.host}` : target.host)
  const execute: SshDiagnosticExecute = async (command, timeoutMs, signal, observe) => {
    if (closed || signal?.aborted) {
      throw new SshClaudeDiagnosticFailure('cancelled')
    }
    observeConnection(password === undefined ? 'key_or_sso_mode' : 'password_mode')
    observeConnection('native_ssh')
    observeConnection('connecting')
    const console = await spawnSshDiagnosticConsole(destination)
    if (closed || signal?.aborted) {
      console.kill()
      throw new SshClaudeDiagnosticFailure('cancelled')
    }
    active.add(console)
    observeConnection('shell_opening')
    try {
      return await runSshClaudeConsole(
        console,
        command,
        timeoutMs,
        signal,
        password,
        observeConnection,
        observe
      )
    } finally {
      active.delete(console)
    }
  }
  return {
    execute,
    close: () => {
      closed = true
      password = undefined
      for (const console of active) {
        console.kill()
      }
      active.clear()
    }
  }
}
