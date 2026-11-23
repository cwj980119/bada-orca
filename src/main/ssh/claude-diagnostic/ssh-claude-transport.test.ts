import { describe, expect, it } from 'vitest'
import {
  fixture,
  closeFixtureServer,
  failFixtureConfiguration,
  untrustFixtureHost
} from './testing/ssh-claude-server.test-fixture'

describe('SSH Claude password transport', () => {
  it.each(['password', 'keyboard-interactive'] as const)(
    'executes concurrent diagnostic and stop commands with %s authentication',
    async (mode) => {
      const { create, events } = await fixture(mode)
      const transport = create()
      const replies = await Promise.all([
        transport.execute('diagnostic', 3000),
        transport.execute('stop', 3000)
      ])
      expect(replies).toEqual([
        { stdout: '연결됨\n', code: 0 },
        { stdout: '연결됨\n', code: 0 }
      ])
      expect(events).toContain('password_mode')
      expect(events).toContain('authenticated')
    }
  )

  it('classifies a refused password without returning the credential', async () => {
    const { create } = await fixture()
    await expect(create('rejected-test-secret').execute('diagnostic', 3000)).rejects.toThrow(
      /^authentication$/
    )
  })

  it('refuses an untrusted host before offering a password', async () => {
    const fixtureState = await fixture()
    untrustFixtureHost()
    await expect(fixtureState.create().execute('diagnostic', 3000)).rejects.toThrow(/^host_key$/)
    expect(fixtureState.offeredSecret()).toBeUndefined()
  })

  it('does not send the password as an OTP answer', async () => {
    const fixtureState = await fixture('otp')
    await expect(fixtureState.create().execute('diagnostic', 3000)).rejects.toThrow(
      /^interactive_authentication$/
    )
    expect(fixtureState.offeredSecret()).toBeUndefined()
  })

  it('reports configuration resolution failure before attempting authentication', async () => {
    const { create, events } = await fixture()
    failFixtureConfiguration()
    await expect(create().execute('diagnostic', 3000)).rejects.toThrow(/^ssh_configuration$/)
    expect(events).not.toContain('password_offered')
  })

  it('reports connection refusal rather than a password error', async () => {
    const { create, events } = await fixture()
    await closeFixtureServer()
    await expect(create().execute('diagnostic', 3000)).rejects.toThrow(/^connection_refused$/)
    expect(events).not.toContain('password_offered')
  })

  it('distinguishes encryption negotiation failure before password authentication', async () => {
    const { create, events } = await fixture('legacy-kex')
    await expect(create().execute('diagnostic', 3000)).rejects.toThrow(/^ssh_negotiation$/)
    expect(events).not.toContain('password_offered')
  })

  it('distinguishes successful login from a refused command channel', async () => {
    const { create, events } = await fixture('command-refused')
    await expect(create().execute('diagnostic', 3000)).rejects.toThrow(/^shell_refused$/)
    expect(events).toContain('authenticated')
    expect(events).not.toContain('command_opened')
  })

  it('cancels while authentication is waiting', async () => {
    const { create, authenticationRequested } = await fixture('stall')
    const transport = create()
    const abort = new AbortController()
    const result = transport.execute('diagnostic', 3000, abort.signal)
    await authenticationRequested
    abort.abort()
    await expect(result).rejects.toThrow(/^cancelled$/)
  })
})
