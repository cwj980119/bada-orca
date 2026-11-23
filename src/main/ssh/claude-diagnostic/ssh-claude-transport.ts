import type { SshTarget } from '../../../shared/remote-runtime/ssh/ssh-types'
import type { SshClaudeConnectionObserver } from '../../../shared/intranet/ssh-claude-diagnostic'
import { spawnSystemSshCommand, spawnSystemSshShell } from '../system-transport/system-ssh-command'
import { SshClaudePasswordSession } from './ssh-claude-password-session'
import { SshClaudeDiagnosticFailure, sshClaudeFailure } from './ssh-claude-failure'
import { readSshClaudeChannel, type SshClaudeOpenedChannel } from './ssh-claude-channel'
import { sshGArgsForHost } from '../config/ssh-g-config-resolution'
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
  const session =
    password === undefined
      ? null
      : new SshClaudePasswordSession(target, password, observeConnection)
  let systemShell = false
  const configArgs = sshGArgsForHost(target.configHost || target.host)
  const options = {
    nonInteractive: true,
    disableControlMaster: true,
    keepAlive: true,
    ...(configArgs[0] === '-F' ? { configFile: configArgs[1] } : {})
  }
  const openSystem = (command: string): SshClaudeOpenedChannel => {
    try {
      observeConnection('connecting')
      if (systemShell) {
        observeConnection('shell_opening')
        return { channel: spawnSystemSshShell(target, options), shell: true, systemSsh: true }
      }
      return {
        channel: spawnSystemSshCommand(target, command, { ...options, closeStdin: true }),
        systemSsh: true
      }
    } catch {
      throw new SshClaudeDiagnosticFailure('ssh_unavailable')
    }
  }
  const execute: SshDiagnosticExecute = async (command, timeoutMs, signal, observe) => {
    observeConnection(session ? 'password_mode' : 'key_or_sso_mode')
    const started = Date.now()
    const read = () =>
      readSshClaudeChannel(
        () => (session ? session.open(command) : openSystem(command)),
        command,
        Math.max(1, timeoutMs - (Date.now() - started)),
        signal,
        observe,
        observeConnection
      )
    try {
      return await read()
    } catch (error) {
      if (
        session ||
        systemShell ||
        signal?.aborted ||
        sshClaudeFailure(error) !== 'command_refused'
      ) {
        throw error
      }
      systemShell = true
      observeConnection('exec_refused')
      return read()
    }
  }
  return { execute, close: () => session?.close() }
}
