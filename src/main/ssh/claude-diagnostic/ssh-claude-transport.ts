import type { SshTarget } from '../../../shared/remote-runtime/ssh/ssh-types'
import type {
  SshClaudeDiagnosticProblem,
  SshClaudeConnectionObserver
} from '../../../shared/intranet/ssh-claude-diagnostic'
import { spawnSystemSshCommand } from '../system-transport/system-ssh-command'
import { StringDecoder } from 'node:string_decoder'
import type { ClientChannel } from 'ssh2'
import { SshClaudePasswordSession } from './ssh-claude-password-session'
import { SshClaudeDiagnosticFailure, sshClaudeFailure } from './ssh-claude-failure'
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
): {
  execute: SshDiagnosticExecute
  close: () => void
} {
  const session =
    password === undefined
      ? null
      : new SshClaudePasswordSession(target, password, observeConnection)
  const execute: SshDiagnosticExecute = (command, timeoutMs, signal, observe) =>
    new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new SshClaudeDiagnosticFailure('cancelled'))
        return
      }
      observeConnection(session ? 'password_mode' : 'key_or_sso_mode')
      let channel: ClientChannel | undefined
      let stdout = ''
      const decoder = new StringDecoder('utf8')
      let stderr = ''
      let settled = false
      const finish = (reply?: SshDiagnosticReply, problem?: SshClaudeDiagnosticProblem): void => {
        if (settled) {
          return
        }
        settled = true
        clearTimeout(timer)
        signal?.removeEventListener('abort', abort)
        if (problem) {
          channel?.close()
          reject(new SshClaudeDiagnosticFailure(problem))
        } else {
          resolve(reply!)
        }
      }
      const abort = (): void => finish(undefined, 'cancelled')
      const timer = setTimeout(() => finish(undefined, 'timed_out'), timeoutMs)
      signal?.addEventListener('abort', abort, { once: true })
      const attach = (opened: ClientChannel): void => {
        if (settled) {
          opened.close()
          return
        }
        channel = opened
        channel.on('data', (data: Buffer) => {
          if (settled) {
            return
          }
          stdout += decoder.write(data)
          if (Buffer.byteLength(stdout) > 256 * 1024) {
            finish(undefined, 'output_limit')
            return
          }
          observe?.(stdout)
        })
        channel.stderr.on('data', (data: Buffer) => {
          if (stderr.length < 8192) {
            stderr += data.toString('utf8').slice(0, 8192 - stderr.length)
          }
        })
        channel.on('error', (error: Error) => finish(undefined, sshClaudeFailure(error)))
        channel.stderr.on('error', (error: Error) => finish(undefined, sshClaudeFailure(error)))
        channel.once('close', (code: number | null) => {
          if (!session && code === 255) {
            finish(undefined, sshClaudeFailure(stderr))
          } else {
            if (code === 0) {
              if (!session) {
                observeConnection('authenticated')
              }
              observeConnection('command_completed')
            }
            finish({ stdout, code })
          }
        })
      }
      if (session) {
        void session.open(command).then(attach, (error: unknown) => {
          finish(undefined, sshClaudeFailure(error))
        })
      } else {
        try {
          observeConnection('connecting')
          attach(
            spawnSystemSshCommand(target, command, {
              nonInteractive: true,
              disableControlMaster: true,
              keepAlive: true,
              closeStdin: true
            })
          )
        } catch {
          finish(undefined, 'ssh_unavailable')
        }
      }
      if (signal?.aborted) {
        abort()
      }
    })
  return { execute, close: () => session?.close() }
}
