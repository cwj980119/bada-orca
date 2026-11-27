import { afterEach, expect, it, vi } from 'vitest'
import { createSsoFixture } from './intranet-sso.test-fixture'

const fixtures: Awaited<ReturnType<typeof createSsoFixture>>[] = []
afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(fixtures.splice(0).map((fixture) => fixture.close()))
})

async function signedIn(options: Parameters<typeof createSsoFixture>[0] = {}) {
  const fixture = await createSsoFixture(options)
  fixtures.push(fixture)
  fixture.service.start(options?.authMethod ? 'test:secret +/' : undefined)
  await vi.waitFor(() => expect(fixture.service.status().state).toBe('signed-in'))
  return fixture
}

it('restores the protected session and rotates its refresh token once for concurrent callers', async () => {
  const fixture = await signedIn({ authMethod: 'client_secret_basic' })
  fixture.service.cancel()
  const reopened = fixture.reopen()
  vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 301_000)
  try {
    await Promise.all([reopened.ensureFresh(), reopened.ensureFresh()])
    expect(reopened.status()).toMatchObject({ state: 'signed-in', persistence: 'encrypted' })
    expect(reopened.credentials()).toMatchObject({
      accessToken: 'renewed-access-token',
      subject: 'employee-7',
      idToken: null
    })
    expect(reopened.credentials()).not.toHaveProperty('refreshToken')
    expect(fixture.retained).toMatchObject({
      clientSecret: 'test:secret +/',
      tokens: { refreshToken: 'rotated-refresh-token' }
    })
  } finally {
    reopened.cancel()
  }
})

it('removes the saved grant when the provider revokes the refresh token', async () => {
  const fixture = await signedIn({ refreshError: 'invalid_grant' })
  vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 301_000)
  expect(await fixture.service.ensureFresh()).toMatchObject({ error: 'session_expired' })
  expect(fixture.service.credentials()).toBeNull()
  expect(fixture.retained).toBeNull()
})

it('keeps the refresh token across a temporary server failure', async () => {
  const options: Parameters<typeof createSsoFixture>[0] = { refreshError: 'unavailable' }
  const fixture = await signedIn(options)
  const now = Date.now()
  const clock = vi.spyOn(Date, 'now').mockReturnValue(now + 301_000)
  expect(await fixture.service.ensureFresh()).toMatchObject({ error: 'refresh_failed' })
  expect(fixture.retained?.tokens?.refreshToken).toBe('company-refresh-token')
  options.refreshError = undefined
  clock.mockReturnValue(now + 332_000)
  expect(await fixture.service.ensureFresh()).toMatchObject({ state: 'signed-in', error: null })
  expect(fixture.service.credentials()?.accessToken).toBe('renewed-access-token')
})

it('does not restore a session after sign-out while a refresh response is pending', async () => {
  const gate = Promise.withResolvers<void>()
  const fixture = await signedIn({ refreshGate: gate.promise })
  vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 301_000)
  const pending = fixture.service.ensureFresh()
  await fixture.refreshReceived
  fixture.service.signOut()
  gate.resolve()
  await pending
  expect(fixture.service.status()).toMatchObject({ state: 'signed-out', identity: null })
  expect(fixture.retained).toBeNull()
})

it('rejects a refreshed ID token belonging to another account', async () => {
  const fixture = await signedIn({ refreshSubject: 'another-account' })
  vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 301_000)
  await fixture.service.ensureFresh()
  expect(fixture.service.credentials()).toBeNull()
  expect(fixture.retained?.identity.subject).toBe('employee-7')
})
