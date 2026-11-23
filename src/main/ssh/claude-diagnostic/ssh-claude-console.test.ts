import { expect, it, vi } from 'vitest'
import {
  runSshClaudeConsole,
  spawnSshDiagnosticConsole,
  type SshDiagnosticConsole
} from './ssh-claude-console'

vi.mock('../system-transport/system-ssh-binary', () => ({ findSystemSsh: () => '/system/ssh' }))
vi.mock('node-pty', () => ({ spawn: vi.fn(() => ({})) }))

function terminal() {
  const data = new Set<(chunk: string) => void>()
  const exits = new Set<(event: { exitCode: number }) => void>()
  const input: string[] = []
  const waiting: ((value: string) => void)[] = []
  const console: SshDiagnosticConsole = {
    write: (text) => {
      input.push(text.toString())
      waiting.shift()?.(text.toString())
    },
    kill: () => {},
    onData: (listener) => {
      data.add(listener)
      return {
        dispose: () => {
          data.delete(listener)
        }
      }
    },
    onExit: (listener) => {
      exits.add(listener)
      return {
        dispose: () => {
          exits.delete(listener)
        }
      }
    }
  }
  return {
    console,
    input,
    nextInput: () => new Promise<string>((resolve) => waiting.push(resolve)),
    output: (text: string) => {
      for (const listener of data) {
        listener(text)
      }
    },
    exit: (exitCode: number) => {
      for (const listener of exits) {
        listener({ exitCode })
      }
    }
  }
}

it('launches the system SSH with only the user-entered destination', async () => {
  const { spawn } = await import('node-pty')
  await spawnSshDiagnosticConsole('tester@host.internal')
  expect(vi.mocked(spawn).mock.calls[0]?.slice(0, 2)).toEqual([
    '/system/ssh',
    ['tester@host.internal']
  ])
})

it('answers the real password prompt before delivering any command to the login shell', async () => {
  const ssh = terminal()
  const reply = runSshClaudeConsole(
    ssh.console,
    "printf '%s\\n' '한글'",
    3000,
    undefined,
    'fixture-password',
    () => {}
  )
  ssh.output("Unauthorized access is forbidden.\r\ntester@host.internal's pass")
  const passwordSent = ssh.nextInput()
  ssh.output('word: ')
  await passwordSent
  expect(ssh.input).toEqual(['fixture-password\r'])
  const launched = ssh.nextInput()
  ssh.output('\r\nLast login: today\r\n\x1b[32mtester@host:~$ \x1b[0m')
  await launched
  const marker = ssh.input[1]?.match(/orca-shell-[a-f0-9-]+/)?.[0]
  if (!marker) {
    throw new Error('No shell command was delivered')
  }
  ssh.output(`\r\n${marker}:rea`)
  const delivered = ssh.nextInput()
  ssh.output('dy\r\n')
  await delivered
  const command = ssh.input[2]
    .split('\r')
    .slice(0, -2)
    .join('')
    .replace(/\\0([0-7]{3})/g, (_value, octal: string) =>
      String.fromCharCode(Number.parseInt(octal, 8))
    )
  expect(command).toBe("printf '%s\\n' '한글'")
  ssh.output(`\r\n${marker}:begin\r\n연결됨\r\n\r\n${marker}:end:17\r\n`)
  expect(await reply).toEqual({ stdout: '연결됨\n', code: 17 })
})

it('refuses a second password prompt without sending the command or repeating a credential', async () => {
  const ssh = terminal()
  const reply = runSshClaudeConsole(
    ssh.console,
    'pwd',
    3000,
    undefined,
    'fixture-password',
    () => {}
  )
  const rejected = expect(reply).rejects.toThrow(/^authentication$/)
  const passwordSent = ssh.nextInput()
  ssh.output('Password: ')
  await passwordSent
  ssh.output('\r\nPermission denied, please try again.\r\nPassword: ')
  await rejected
  expect(ssh.input).toEqual(['fixture-password\r'])
})

it.each([
  ['Are you sure you want to continue connecting (yes/no/[fingerprint])? ', 'host_key'],
  ['Verification code: ', 'interactive_authentication']
])('does not substitute the password for %s', async (prompt, problem) => {
  const ssh = terminal()
  const reply = runSshClaudeConsole(
    ssh.console,
    'pwd',
    3000,
    undefined,
    'fixture-password',
    () => {}
  )
  const rejected = expect(reply).rejects.toThrow(new RegExp(`^${problem}$`))
  ssh.output(prompt)
  await rejected
  expect(ssh.input).toEqual([])
})

it('requires a completion frame even if the SSH process exits successfully', async () => {
  const ssh = terminal()
  const reply = runSshClaudeConsole(ssh.console, 'pwd', 3000, undefined, undefined, () => {})
  const rejected = expect(reply).rejects.toThrow(/^shell_protocol$/)
  const launched = ssh.nextInput()
  ssh.output('tester@host:~$ ')
  await launched
  ssh.exit(0)
  await rejected
})

it('cancels while the native terminal is still waiting for login', async () => {
  const ssh = terminal()
  const abort = new AbortController()
  const reply = runSshClaudeConsole(ssh.console, 'pwd', 3000, abort.signal, undefined, () => {})
  const rejected = expect(reply).rejects.toThrow(/^cancelled$/)
  abort.abort()
  await rejected
  expect(ssh.input).toEqual([])
})
