import { afterEach, expect, it, vi } from 'vitest'
import { defaultIntranetSsoSettings } from '../../shared/intranet/intranet-sso'
import { IntranetSsoService } from './intranet-sso-service'
import { IntranetSsoProviderClient } from './intranet-sso-provider'
import { createSsoFixture } from './intranet-sso.test-fixture'
import type { IntranetSsoSession } from '../../shared/intranet/intranet-sso'
import { registerRuntimeIntranetSso, withBadaAgentEnvironment } from './runtime-intranet-sso'
import { OrcaRuntimeService } from '../runtime/orca-runtime'
import { INTRANET_SSO_METHODS } from '../runtime/rpc/methods/intranet-sso'

const fixtures: Awaited<ReturnType<typeof createSsoFixture>>[] = []
afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(fixtures.splice(0).map((fixture) => fixture.close()))
})

it('shares the signed-in account with agents and refuses it after expiry or sign-out', async () => {
  const fixture = await createSsoFixture({
    authMethod: 'client_secret_basic',
    clientSecret: () => 'test:secret +/'
  })
  fixtures.push(fixture)
  const runtime = new OrcaRuntimeService()
  const dispose = registerRuntimeIntranetSso(runtime, fixture.service)
  const method = INTRANET_SSO_METHODS.find((entry) => entry.name === 'intranet.ssoCredentials')!
  const context = { runtime, caller: { kind: 'local-cli' as const } }
  try {
    fixture.service.start()
    await vi.waitFor(() => expect(fixture.service.status().state).toBe('signed-in'))
    expect(method.handler({}, context)).toMatchObject({
      accessToken: 'company-access-token',
      email: 'alice@company.internal'
    })
    expect(withBadaAgentEnvironment({ KEPT: 'value' })).toMatchObject({
      KEPT: 'value',
      ORCA_BADA_NAME: 'Alice',
      ORCA_BADA_EMAIL: 'alice@company.internal',
      ORCA_BADA_ACCESS_TOKEN: 'company-access-token',
      ORCA_BADA_SUBJECT: 'employee-7'
    })
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 301_000)
    expect(fixture.service.credentials()).toBeNull()
    expect(() => method.handler({}, context)).toThrow('Sign in to BADA again')
    expect(withBadaAgentEnvironment({ ORCA_BADA_ACCESS_TOKEN: 'stale', KEPT: 'value' })).toEqual({
      KEPT: 'value'
    })
    clock.mockRestore()
    fixture.service.signOut()
    expect(() => method.handler({}, context)).toThrow('Sign in to BADA again')
    expect(withBadaAgentEnvironment({})).toEqual({})
  } finally {
    dispose()
  }
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

it('completes OIDC with PKCE and makes tokens available only through the credential API', async () => {
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
  expect(fixture.service.credentials()).toMatchObject({
    accessToken: 'company-access-token',
    subject: 'employee-7',
    email: 'alice@company.internal'
  })
  expect(JSON.stringify(fixture.identities)).not.toContain('company-refresh-token')
  fixture.service.signOut()
  expect(fixture.service.status()).toMatchObject({ state: 'signed-out', identity: null })
  expect(fixture.retained).toBeNull()
  expect(fixture.service.credentials()).toBeNull()
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
  const pending = Promise.withResolvers<IntranetSsoSession>()
  const exchange = vi.spyOn(provider, 'exchange').mockImplementation(() => pending.promise)
  const fixture = await createSsoFixture({ provider })
  fixtures.push(fixture)
  fixture.service.start()
  await vi.waitFor(() => expect(exchange).toHaveBeenCalled())
  fixture.service.signOut()
  pending.resolve({
    identity: {
      issuer: 'ignored',
      subject: 'late-employee',
      name: null,
      email: null,
      expiresAt: Date.now() + 60_000
    }
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
