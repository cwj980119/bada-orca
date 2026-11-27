import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setSecretStore, _resetSecretStoreForTests } from '../../shared/secure-storage/secret-store'
import { removeTempDirs } from '../../shared/testing/remove-temp-dirs.test-support'
import { IntranetMcpVault } from './intranet-mcp-vault'
import type { IntranetMcpServer } from '../../shared/intranet/intranet-resources'

export async function mcpOAuthFixture() {
  const root = mkdtempSync(join(tmpdir(), 'orca-mcp-auth-'))
  const key = randomBytes(32)
  setSecretStore({
    isEncryptionAvailable: () => true,
    describeProtectionGap: () => null,
    encryptString: (plain) => {
      const iv = randomBytes(12)
      const cipher = createCipheriv('aes-256-gcm', key, iv)
      const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
      return Buffer.concat([iv, cipher.getAuthTag(), encrypted])
    },
    decryptString: (sealed) => {
      const decipher = createDecipheriv('aes-256-gcm', key, sealed.subarray(0, 12))
      decipher.setAuthTag(sealed.subarray(12, 28))
      return Buffer.concat([decipher.update(sealed.subarray(28)), decipher.final()]).toString(
        'utf8'
      )
    }
  })
  let origin = ''
  let challenge = ''
  let releaseRefresh: (() => void) | undefined
  let enteredRefresh: (() => void) | undefined
  let waitForRelease: Promise<void> | undefined
  const server = createServer(async (req, res) => {
    const url = new URL(req.url!, origin)
    res.setHeader('content-type', 'application/json')
    const reply = (value: unknown) => res.end(JSON.stringify(value))
    if (url.pathname.startsWith('/.well-known/oauth-protected-resource')) {
      reply({
        resource: `${origin}/mcp`,
        authorization_servers: [origin],
        scopes_supported: ['mcp:read']
      })
      return
    }
    if (url.pathname.startsWith('/.well-known/oauth-authorization-server')) {
      reply({
        issuer: origin,
        authorization_endpoint: `${origin}/authorize`,
        token_endpoint: `${origin}/token`,
        registration_endpoint: `${origin}/register`,
        response_types_supported: ['code'],
        code_challenge_methods_supported: ['S256'],
        token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
        grant_types_supported: ['authorization_code', 'refresh_token', 'client_credentials']
      })
      return
    }
    let body = ''
    for await (const chunk of req) {
      body += chunk
    }
    if (url.pathname === '/register') {
      reply({ ...JSON.parse(body), client_id: 'registered-orca' })
      return
    }
    if (url.pathname === '/token') {
      const params = new URLSearchParams(body)
      if (params.get('grant_type') === 'authorization_code') {
        if (
          params.get('code') !== 'approved-code' ||
          createHash('sha256')
            .update(params.get('code_verifier') ?? '')
            .digest('base64url') !== challenge
        ) {
          res.statusCode = 400
          reply({ error: 'invalid_grant' })
          return
        }
        reply({
          access_token: 'access-before',
          refresh_token: 'refresh-before',
          token_type: 'Bearer',
          expires_in: 3600
        })
        return
      }
      if (
        params.get('grant_type') === 'refresh_token' &&
        params.get('refresh_token') === 'refresh-before'
      ) {
        enteredRefresh?.()
        await waitForRelease
        reply({
          access_token: 'access-after',
          refresh_token: 'refresh-after',
          token_type: 'Bearer',
          expires_in: 3600
        })
        return
      }
      if (
        params.get('grant_type') === 'client_credentials' &&
        params.get('client_id') === 'service-client' &&
        params.get('client_secret') === 'service-secret'
      ) {
        reply({ access_token: 'service-access', token_type: 'Bearer', expires_in: 3600 })
        return
      }
      res.statusCode = 400
      reply({ error: 'invalid_client' })
      return
    }
    res.statusCode = 404
    reply({ error: 'not_found' })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Missing loopback port')
  }
  origin = `http://127.0.0.1:${address.port}`
  const config: IntranetMcpServer = {
    id: 'company',
    name: 'Company',
    purpose: 'tools',
    enabled: true,
    transport: 'http',
    url: `${origin}/mcp`,
    command: '',
    args: [],
    tokenEnv: '',
    auth: {
      type: 'oauth',
      flow: 'authorization_code',
      clientId: '',
      scopes: 'mcp:read',
      callbackPort: 0
    }
  }
  return {
    root,
    origin,
    config,
    vault: new IntranetMcpVault(root),
    approve: async (value: string) => {
      const url = new URL(value)
      if (url.origin !== origin || url.searchParams.get('code_challenge_method') !== 'S256') {
        throw new Error('Invalid PKCE authorization request')
      }
      challenge = url.searchParams.get('code_challenge') ?? ''
      const callback = new URL(url.searchParams.get('redirect_uri')!)
      callback.searchParams.set('state', url.searchParams.get('state')!)
      callback.searchParams.set('code', 'approved-code')
      callback.searchParams.set('iss', origin)
      const response = await fetch(callback)
      void response.text()
    },
    pauseRefresh: () => {
      waitForRelease = new Promise<void>((resolve) => {
        releaseRefresh = resolve
      })
      return new Promise<void>((resolve) => {
        enteredRefresh = resolve
      })
    },
    releaseRefresh: () => releaseRefresh?.(),
    close: async () => {
      releaseRefresh?.()
      server.closeAllConnections()
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      )
      _resetSecretStoreForTests()
      await removeTempDirs([root])
    }
  }
}
