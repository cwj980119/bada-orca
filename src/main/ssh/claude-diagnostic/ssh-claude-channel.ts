import { StringDecoder } from 'node:string_decoder'
import type { ClientChannel } from 'ssh2'
import type {
  SshClaudeConnectionObserver,
  SshClaudeDiagnosticProblem
} from '../../../shared/intranet/ssh-claude-diagnostic'
import { SshClaudeDiagnosticFailure, sshClaudeFailure } from './ssh-claude-failure'
import { SshClaudeShellFrame } from './ssh-claude-shell-frame'
import type { SshDiagnosticReply } from './ssh-claude-transport'

export type SshClaudeOpenedChannel = { channel: ClientChannel; shell?: true; systemSsh?: true }

export function readSshClaudeChannel(
  open: () => SshClaudeOpenedChannel | Promise<SshClaudeOpenedChannel>,
  command: string,
  timeoutMs: number,
  signal?: AbortSignal,
  observe?: (stdout: string) => void,
  connection: SshClaudeConnectionObserver = () => {}
): Promise<SshDiagnosticReply> {
  return new Promise((resolve, reject) => {
    let channel: ClientChannel | undefined
    let settled = false
    let stdout = ''
    let stderr = ''
    const decoder = new StringDecoder('utf8')
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
        if (reply?.code === 0) {
          connection('command_completed')
        }
        resolve(reply!)
      }
    }
    const abort = (): void => finish(undefined, 'cancelled')
    const timer = setTimeout(() => finish(undefined, 'timed_out'), timeoutMs)
    signal?.addEventListener('abort', abort, { once: true })
    const attach = (opened: SshClaudeOpenedChannel): void => {
      if (settled) {
        opened.channel.on('error', () => {})
        opened.channel.stderr.on('error', () => {})
        opened.channel.close()
        return
      }
      channel = opened.channel
      const frame = opened.shell ? new SshClaudeShellFrame(command) : null
      channel.on('data', (data: Buffer) => {
        if (settled) {
          return
        }
        try {
          const decoded = decoder.write(data)
          const part = frame?.push(decoded)
          if (part) {
            stdout = part.stdout
            if (part.send !== undefined) {
              if (opened.systemSsh) {
                connection('authenticated')
                connection('shell_opened')
              }
              connection('shell_ready')
              channel!.write(part.send)
            }
          } else {
            stdout += decoded
          }
          if (Buffer.byteLength(stdout) > 256 * 1024) {
            finish(undefined, 'output_limit')
            return
          }
          observe?.(stdout)
          if (part?.code !== undefined) {
            finish({ stdout, code: part.code })
            channel!.close()
          }
        } catch (error) {
          finish(undefined, sshClaudeFailure(error))
        }
      })
      channel.stderr.on('data', (data: Buffer) => {
        if (stderr.length < 8192) {
          stderr += data.toString('utf8').slice(0, 8192 - stderr.length)
        }
      })
      channel.on('error', (error: Error) => finish(undefined, sshClaudeFailure(error)))
      channel.stderr.on('error', (error: Error) => finish(undefined, sshClaudeFailure(error)))
      channel.once('close', (code: number | null) => {
        if (opened.systemSsh && code === 255) {
          finish(undefined, sshClaudeFailure(stderr))
        } else if (frame) {
          finish(undefined, 'shell_protocol')
        } else {
          if (opened.systemSsh && code === 0) {
            connection('authenticated')
          }
          finish({ stdout, code })
        }
      })
      if (frame) {
        channel.write(frame.launch())
      }
    }
    if (signal?.aborted) {
      abort()
      return
    }
    try {
      void Promise.resolve(open())
        .then(attach)
        .catch((error: unknown) => finish(undefined, sshClaudeFailure(error)))
    } catch (error) {
      finish(undefined, sshClaudeFailure(error))
    }
  })
}
