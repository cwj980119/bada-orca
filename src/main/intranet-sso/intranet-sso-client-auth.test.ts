import { afterEach, expect, it, vi } from 'vitest'
import { IntranetSsoProviderClient } from './intranet-sso-provider'
import { createSsoFixture } from './intranet-sso.test-fixture'

const fixtures: Awaited<ReturnType<typeof createSsoFixture>>[] = []
afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((fixture) => fixture.close()))
})

it.each(['client_secret_basic', 'client_secret_post'] as const)(
  'signs in with the directly entered secret using %s without an environment variable',
  async (authMethod) => {
    const fixture = await createSsoFixture({
      authMethod,
      omitPkceMetadata: true,
      userInfoOnly: true,
      provider: new IntranetSsoProviderClient(undefined, () => undefined)
    })
    fixtures.push(fixture)
    fixture.service.start('test:secret +/')
    await vi.waitFor(() => expect(fixture.service.status().state).toBe('signed-in'))
    expect(fixture.service.status().identity).toMatchObject({
      subject: 'employee-7',
      name: 'Alice',
      email: 'alice@company.internal'
    })
    expect(JSON.stringify(fixture.service.status())).not.toContain('test:secret +/')
  }
)

it('reports missing client credentials before starting authentication', async () => {
  const fixture = await createSsoFixture({
    authMethod: 'client_secret_basic',
    provider: new IntranetSsoProviderClient(undefined, () => undefined)
  })
  fixtures.push(fixture)
  fixture.service.start()
  await vi.waitFor(() => expect(fixture.service.status().state).toBe('error'))
  expect(fixture.service.status()).toMatchObject({ error: 'missing_client_secret', identity: null })
})

it('rejects UserInfo for a different subject than the signed ID token', async () => {
  const fixture = await createSsoFixture({
    authMethod: 'client_secret_basic',
    userInfoOnly: true,
    profileSubject: 'another-employee',
    provider: new IntranetSsoProviderClient(undefined, () => 'test:secret +/')
  })
  fixtures.push(fixture)
  fixture.service.start()
  await vi.waitFor(() => expect(fixture.service.status().state).toBe('error'))
  expect(fixture.service.status()).toMatchObject({ error: 'invalid_identity', identity: null })
})
