import { expect, it } from 'vitest'
import { fixture } from './testing/ssh-claude-server.test-fixture'

it('logs in and delivers commands through a PTY shell when exec requests are refused', async () => {
  const server = await fixture('shell-only', { stdout: '연결됨\n', code: 17 })
  const command = `printf '%s\\n' "literal ; $(false) ' 한글"\n${'x'.repeat(9000)}`
  const result = await server.create().execute(command, 3000)
  expect(result).toEqual({ stdout: '연결됨\n', code: 17 })
  expect(server.commands[0]).toBe(command)
  expect(server.events).toContain('authenticated')
  expect(server.events).toContain('exec_refused')
  expect(server.events).toContain('shell_ready')
})

it('runs the diagnostic and stop commands on independent logged-in shell channels', async () => {
  const server = await fixture('shell-only')
  const transport = server.create()
  await transport.execute('initial probe', 3000)
  const replies = await Promise.all([
    transport.execute('diagnostic', 3000),
    transport.execute('stop', 3000)
  ])
  expect(replies).toEqual([
    { stdout: '셸 명령 결과\n', code: 0 },
    { stdout: '셸 명령 결과\n', code: 0 }
  ])
})

it('refuses to report success when a logged-in shell closes without command completion', async () => {
  const server = await fixture('broken-shell')
  await expect(server.create().execute('diagnostic', 3000)).rejects.toThrow(/^shell_protocol$/)
})

it('cancels an active terminal-shell command', async () => {
  const server = await fixture('stall-shell', { stdout: 'running\n', code: 0 })
  const abort = new AbortController()
  await expect(
    server.create().execute('diagnostic', 3000, abort.signal, (stdout) => {
      if (stdout.includes('running')) {
        abort.abort()
      }
    })
  ).rejects.toThrow(/^cancelled$/)
})
