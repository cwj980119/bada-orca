import type { IPty } from 'node-pty'
import { homedir } from 'node:os'
import { findSystemSsh } from '../system-transport/system-ssh-binary'
import { SshClaudeConsoleScreen } from './ssh-claude-console-screen'
import type { SshClaudeConnectionObserver } from '../../../shared/intranet/ssh-claude-diagnostic'
import { SshClaudeDiagnosticFailure, sshClaudeFailure } from './ssh-claude-failure'
import { SshClaudeShellFrame } from './ssh-claude-shell-frame'
import type { SshDiagnosticReply } from './ssh-claude-transport'

export type SshDiagnosticConsole = Pick<IPty, 'write' | 'kill' | 'onData' | 'onExit'>

export async function spawnSshDiagnosticConsole(
  destination: string
): Promise<SshDiagnosticConsole> {
  const executable = findSystemSsh()
  if (!executable) {
    throw new SshClaudeDiagnosticFailure('ssh_unavailable')
  }
  const { spawn } = await import('node-pty')
  return spawn(executable, [destination], {
    name: 'dumb',
    cols: 4096,
    rows: 30,
    cwd: homedir(),
    env: process.env
  })
}

export function runSshClaudeConsole(
  console: SshDiagnosticConsole,
  command: string,
  timeoutMs: number,
  signal: AbortSignal | undefined,
  password: string | undefined,
  connection: SshClaudeConnectionObserver,
  observe?: (stdout: string) => void
): Promise<SshDiagnosticReply> {
  return new Promise((resolve, reject) => {
    const frame = new SshClaudeShellFrame(command)
    const screen = new SshClaudeConsoleScreen()
    let startup = ''
    let receivedBytes = 0
    let launched = false
    let answered = false
    let settled = false
    const subscriptions: { dispose(): void }[] = []
    const finish = (reply?: SshDiagnosticReply, error?: unknown): void => {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      for (const subscription of subscriptions) {
        subscription.dispose()
      }
      screen.dispose()
      try {
        console.kill()
      } catch {
        /* The SSH process may already have exited. */
      }
      if (error) {
        reject(new SshClaudeDiagnosticFailure(sshClaudeFailure(error)))
      } else {
        resolve(reply!)
      }
    }
    const fail = (problem: ConstructorParameters<typeof SshClaudeDiagnosticFailure>[0]): void =>
      finish(undefined, new SshClaudeDiagnosticFailure(problem))
    const abort = (): void => fail('cancelled')
    const timer = setTimeout(() => fail(launched ? 'timed_out' : 'shell_prompt'), timeoutMs)
    const send = (text: string): void => console.write(text.replace(/\n/g, '\r'))
    signal?.addEventListener('abort', abort, { once: true })
    const receive = (clean: string): void => {
      if (settled) {
        return
      }
      try {
        if (!launched) {
          startup = clean.slice(-16384)
          const prompt = clean.slice(clean.lastIndexOf('\n') + 1)
          if (
            /are you sure you want to continue connecting|host key verification failed|remote host identification has changed/i.test(
              startup
            )
          ) {
            fail('host_key')
            return
          }
          if (
            /(?:verification code|one.time password|\botp\b|token code)[^\n]*:\s*$/i.test(prompt)
          ) {
            fail('interactive_authentication')
            return
          }
          if (/(?:password|passphrase for key[^\n]*):\s*$/i.test(prompt)) {
            if (answered) {
              fail('authentication')
              return
            }
            if (!password || /passphrase for key/i.test(prompt)) {
              fail('interactive_authentication')
              return
            }
            answered = true
            connection('password_offered')
            send(`${password}\n`)
            password = undefined
            return
          }
          if (!/^[^\n]*[#$>%]\s*$/.test(prompt)) {
            return
          }
          launched = true
          connection('authenticated')
          connection('shell_opened')
          send(frame.launch())
          return
        }
        const part = frame.push(clean)
        if (part.send !== undefined) {
          connection('shell_ready')
          send(part.send)
        }
        observe?.(part.stdout)
        if (part.code !== undefined) {
          if (part.code === 0) {
            connection('command_completed')
          }
          finish({ stdout: part.stdout, code: part.code })
        }
      } catch (error) {
        finish(undefined, error)
      }
    }
    subscriptions.push(
      console.onData((chunk) => {
        receivedBytes += Buffer.byteLength(chunk)
        if (receivedBytes > 1024 * 1024) {
          fail('output_limit')
          return
        }
        screen.write(chunk, receive)
      })
    )
    subscriptions.push(
      console.onExit(({ exitCode }) =>
        screen.write('', () => {
          if (settled) {
            return
          }
          if (launched) {
            fail('shell_protocol')
          } else {
            const problem = sshClaudeFailure(startup)
            fail(problem === 'ssh_failed' && exitCode === 0 ? 'shell_prompt' : problem)
          }
        })
      )
    )
    if (signal?.aborted) {
      abort()
    }
  })
}
