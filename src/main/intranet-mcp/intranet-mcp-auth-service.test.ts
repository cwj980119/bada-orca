import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { mcpOAuthFixture } from './intranet-mcp-oauth.test-fixture'
import { authorizeIntranetMcp } from './intranet-mcp-authorization'
import { IntranetMcpAuthService } from './intranet-mcp-auth-service'

let fixture: Awaited<ReturnType<typeof mcpOAuthFixture>> | undefined
afterEach(async () => {
  await fixture?.close()
  fixture = undefined
})

it('signs in with PKCE, persists encrypted tokens and refreshes after expiry across service restarts', async () => {
  fixture = await mcpOAuthFixture()
  const { config, vault, approve, root } = fixture
  const session = vault.read(config)
  await authorizeIntranetMcp(
    config,
    session,
    () => vault.save(config, session),
    undefined,
    new AbortController().signal,
    approve
  )
  const service = new IntranetMcpAuthService(vault)
  expect(await service.headers(config)).toEqual({ Authorization: 'Bearer access-before' })
  expect(JSON.stringify(service.status(config))).not.toContain('access-before')
  expect(readFileSync(join(root, readdirSync(root)[0]!), 'utf8')).not.toContain('refresh-before')
  const expired = vault.read(config)
  expired.expiresAt = 1
  vault.save(config, expired)
  expect(await new IntranetMcpAuthService(vault).headers(config)).toEqual({
    Authorization: 'Bearer access-after'
  })
  expect(vault.read(config).tokens?.refresh_token).toBe('refresh-after')
})

it('does not restore a grant when a refresh finishes after authentication was removed', async () => {
  fixture = await mcpOAuthFixture()
  const { config, vault, approve } = fixture
  const session = vault.read(config)
  await authorizeIntranetMcp(
    config,
    session,
    () => vault.save(config, session),
    undefined,
    new AbortController().signal,
    approve
  )
  const service = new IntranetMcpAuthService(vault)
  const entered = fixture.pauseRefresh()
  const pending = service.headers(config, 'access-before')
  const refused = expect(pending).rejects.toThrow()
  await entered
  service.clear(config)
  fixture.releaseRefresh()
  await refused
  expect(service.status(config).state).toBe('signed-out')
  expect(vault.read(config).tokens).toBeUndefined()
})

it('uses saved API keys and host credentials without leaking them into connection settings', async () => {
  fixture = await mcpOAuthFixture()
  const { config, vault } = fixture
  const service = new IntranetMcpAuthService(vault, (name) =>
    name === 'SERVICE_SECRET' ? 'service-secret' : undefined
  )
  const api = {
    ...config,
    auth: {
      type: 'api-key' as const,
      header: 'X-Company-Key',
      secret: { source: 'stored' as const, env: '' }
    }
  }
  service.saveSecret(api, 'key-secret')
  expect(await service.headers(api)).toEqual({ 'X-Company-Key': 'key-secret' })
  await expect(service.headers({ ...api, url: `${fixture.origin}/another-mcp` })).rejects.toThrow()
  expect(JSON.stringify(api)).not.toContain('key-secret')
  const machine = {
    ...config,
    auth: {
      type: 'oauth' as const,
      flow: 'client_credentials' as const,
      clientId: 'service-client',
      scopes: 'mcp:read',
      clientSecret: { source: 'env' as const, env: 'SERVICE_SECRET' }
    }
  }
  expect(await service.headers(machine)).toEqual({ Authorization: 'Bearer service-access' })
})
