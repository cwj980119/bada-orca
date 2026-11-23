import { afterEach, expect, it, vi } from 'vitest'
import { defaultIntranetSsoSettings } from '../../shared/intranet/intranet-sso'
import { IntranetSsoService } from './intranet-sso-service'
import { IntranetSsoProviderClient } from './intranet-sso-provider'
import { createSsoFixture } from './intranet-sso.test-fixture'

const fixtures: Awaited<ReturnType<typeof createSsoFixture>>[] = []
afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((fixture) => fixture.close()))
})

it('remains local and refuses login until the owner configures SSO', () => {
  const openBrowser = vi.fn()
  const service = new IntranetSsoService({
    settings: defaultIntranetSsoSettings,
    openBrowser,
    session: { read: () => null, save: () => false, clear: () => {} }
  })
  expect(service.status()).toMatchObject({ state: 'unconfigured', identity: null })
  expect(() => service.start()).toThrow('unconfigured')
  expect(openBrowser).not.toHaveBeenCalled()
})

it('completes OIDC with PKCE, ignores another flow state, and retains no tokens', async () => {
  const fixture = await createSsoFixture({ strayState: true })
  fixtures.push(fixture)
  fixture.service.start()
  await vi.waitFor(() => expect(fixture.service.status().state).toBe('signed-in'))
  expect(fixture.pkceVerified).toBe(true)
  expect(fixture.service.status().identity).toMatchObject({
    subject: 'employee-7',
    name: 'Alice',
    email: 'alice@company.internal'
  })
  expect(JSON.stringify(fixture.service.status())).not.toContain('company-access-token')
  expect(JSON.stringify(fixture.identities)).not.toContain('company-refresh-token')
  fixture.service.signOut()
  expect(fixture.service.status()).toMatchObject({ state: 'signed-out', identity: null })
  expect(fixture.retained).toBeNull()
})

it.each([{ nonce: 'another-login' }, { audience: 'another-client' }])(
  'rejects an ID token for a different login/client: %j',
  async (options) => {
    const fixture = await createSsoFixture(options)
    fixtures.push(fixture)
    fixture.service.start()
    await vi.waitFor(() => expect(fixture.service.status().state).toBe('error'))
    expect(fixture.service.status()).toMatchObject({ error: 'invalid_token', identity: null })
    expect(fixture.retained).toBeNull()
  }
)

it('uses the configured OAuth2 user ID field after the authenticated profile request', async () => {
  const fixture = await createSsoFixture({ protocol: 'oauth2' })
  fixtures.push(fixture)
  fixture.service.start()
  await vi.waitFor(() => expect(fixture.service.status().state).toBe('signed-in'))
  expect(fixture.service.status().identity).toMatchObject({ subject: 'employee-7', name: 'Alice' })
})

it('discards a late verified identity after sign-out', async () => {
  const provider = new IntranetSsoProviderClient()
  const pending = Promise.withResolvers<{
    issuer: string
    subject: string
    name: null
    email: null
    expiresAt: number
  }>()
  const exchange = vi.spyOn(provider, 'exchange').mockImplementation(() => pending.promise)
  const fixture = await createSsoFixture({ provider })
  fixtures.push(fixture)
  fixture.service.start()
  await vi.waitFor(() => expect(exchange).toHaveBeenCalled())
  fixture.service.signOut()
  pending.resolve({
    issuer: 'ignored',
    subject: 'late-employee',
    name: null,
    email: null,
    expiresAt: Date.now() + 60_000
  })
  await pending.promise
  expect(fixture.service.status()).toMatchObject({ state: 'signed-out', identity: null })
  expect(fixture.retained).toBeNull()
})

it('invalidates a connected account when the configured client changes', async () => {
  const fixture = await createSsoFixture()
  fixtures.push(fixture)
  fixture.service.start()
  await vi.waitFor(() => expect(fixture.service.status().state).toBe('signed-in'))
  fixture.setSettings({ clientId: 'new-client' })
  expect(fixture.service.status()).toMatchObject({ state: 'signed-out', identity: null })
  expect(fixture.retained).toBeNull()
})

it('reports an occupied configured callback port without changing to another port', async () => {
  const fixture = await createSsoFixture({ occupiedCallbackPort: true })
  fixtures.push(fixture)
  fixture.service.start()
  await vi.waitFor(() => expect(fixture.service.status().state).toBe('error'))
  expect(fixture.service.status()).toMatchObject({ error: 'callback_unavailable', identity: null })
  expect(fixture.retained).toBeNull()
})
