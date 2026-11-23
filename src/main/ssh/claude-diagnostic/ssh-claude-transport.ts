import type { SshTarget } from '../../../shared/remote-runtime/ssh/ssh-types'
import type { SshClaudeDiagnosticProblem } from '../../../shared/intranet/ssh-claude-diagnostic'
import { spawnSystemSshCommand } from '../system-transport/system-ssh-command'
import { StringDecoder } from 'node:string_decoder'
import type { ClientChannel } from 'ssh2'
import { SshClaudePasswordSession } from './ssh-claude-password-session'

export class SshClaudeDiagnosticFailure extends Error {
  constructor(readonly problem: SshClaudeDiagnosticProblem) {
    super(problem)
  }
}

export type SshDiagnosticReply = { stdout: string; code: number | null }
export type SshDiagnosticExecute = (
  command: string,
  timeoutMs: number,
  signal?: AbortSignal,
  observe?: (stdout: string) => void
) => Promise<SshDiagnosticReply>

function sshProblem(stderr: string): SshClaudeDiagnosticProblem {
  if (
    /permission denied|authentication (?:methods )?failed|no supported authentication|sign_and_send_pubkey/i.test(
      stderr
    )
  ) {
    return 'authentication'
  }
  if (/host key verification failed|remote host identification has changed/i.test(stderr)) {
    return 'host_key'
  }
  return 'ssh_failed'
}

export function sshDiagnosticTransport(
  target: SshTarget,
  password?: string
): {
  execute: SshDiagnosticExecute
  close: () => void
} {
  const session = password === undefined ? null : new SshClaudePasswordSession(target, password)
  const execute: SshDiagnosticExecute = (command, timeoutMs, signal, observe) =>
    new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new SshClaudeDiagnosticFailure('cancelled'))
        return
      }
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
        channel.on('error', () => finish(undefined, 'ssh_failed'))
        channel.stderr.on('error', () => finish(undefined, 'ssh_failed'))
        channel.once('close', (code: number | null) => {
          if (code === 255) {
            finish(undefined, sshProblem(stderr))
          } else {
            finish({ stdout, code })
          }
        })
      }
      if (session) {
        void session.open(command).then(attach, (error: unknown) => {
          finish(undefined, sshProblem(error instanceof Error ? error.message : ''))
        })
      } else {
        try {
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
