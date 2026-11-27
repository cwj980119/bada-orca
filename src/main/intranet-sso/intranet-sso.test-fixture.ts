import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { exportJWK, generateKeyPair, SignJWT } from 'jose'
import {
  defaultIntranetSsoSettings,
  type IntranetSsoSession,
  type IntranetSsoSettings
} from '../../shared/intranet/intranet-sso'
import { IntranetSsoService } from './intranet-sso-service'
import type { IntranetSsoProviderClient } from './intranet-sso-provider'

export async function createSsoFixture(
  options: {
    nonce?: string
    audience?: string
    subject?: string
    protocol?: 'oidc' | 'oauth2'
    strayState?: boolean
    occupiedCallbackPort?: boolean
    provider?: IntranetSsoProviderClient
    authMethod?: 'client_secret_basic' | 'client_secret_post'
    clientSecret?: () => string
    omitPkceMetadata?: boolean
    userInfoOnly?: boolean
    profileSubject?: string
    refreshable?: boolean
    refreshError?: 'invalid_grant' | 'unavailable'
    refreshSubject?: string
    refreshGate?: Promise<void>
  } = {}
) {
  const { publicKey, privateKey } = await generateKeyPair('RS256')
  const jwk = await exportJWK(publicKey)
  let authorization: URL | null = null
  let pkceVerified = false
  let callback: Promise<string> | null = null
  const identities: IntranetSsoSession[] = []
  let retained: IntranetSsoSession | null = null
  let base = ''
  let refreshToken = 'company-refresh-token'
  const refreshReceived = Promise.withResolvers<void>()
  const server = createServer((request, response) => {
    void (async () => {
      response.setHeader('content-type', 'application/json')
      if (request.url === '/.well-known/openid-configuration') {
        response.end(
          JSON.stringify({
            issuer: base,
            authorization_endpoint: `${base}/authorize`,
            token_endpoint: `${base}/token`,
            jwks_uri: `${base}/jwks`,
            ...(options.userInfoOnly ? { userinfo_endpoint: `${base}/profile` } : {}),
            ...(options.omitPkceMetadata ? {} : { code_challenge_methods_supported: ['S256'] }),
            token_endpoint_auth_methods_supported: [options.authMethod ?? 'none']
          })
        )
      } else if (request.url === '/jwks') {
        response.end(JSON.stringify({ keys: [{ ...jwk, alg: 'RS256' }] }))
      } else if (request.url === '/profile') {
        if (request.headers.authorization !== 'Bearer company-access-token') {
          response.writeHead(401)
          response.end('{}')
          return
        }
        response.end(
          JSON.stringify({
            sub: options.profileSubject ?? 'employee-7',
            uid: 'employee-7',
            name: 'Alice',
            email: 'alice@company.internal'
          })
        )
      } else if (request.url === '/token') {
        let text = ''
        for await (const part of request) {
          text += String(part)
        }
        const form = new URLSearchParams(text)
        if (
          (options.authMethod === 'client_secret_basic' &&
            (!request.headers.authorization?.startsWith('Basic ') ||
              Buffer.from(request.headers.authorization.slice(6), 'base64').toString() !==
                'desktop-test-client:test%3Asecret+%2B%2F' ||
              form.has('client_secret'))) ||
          (options.authMethod === 'client_secret_post' &&
            (request.headers.authorization !== undefined ||
              form.get('client_id') !== 'desktop-test-client' ||
              form.get('client_secret') !== 'test:secret +/'))
        ) {
          response.writeHead(401)
          response.end('{}')
          return
        }
        if (form.get('grant_type') === 'refresh_token') {
          refreshReceived.resolve()
          await options.refreshGate
          if (options.refreshError || form.get('refresh_token') !== refreshToken) {
            response.writeHead(options.refreshError === 'unavailable' ? 503 : 400)
            response.end(JSON.stringify({ error: options.refreshError ?? 'invalid_grant' }))
            return
          }
          refreshToken = 'rotated-refresh-token'
          const idToken = options.refreshSubject
            ? await new SignJWT({})
                .setProtectedHeader({ alg: 'RS256' })
                .setIssuer(base)
                .setAudience('desktop-test-client')
                .setSubject(options.refreshSubject)
                .setIssuedAt()
                .setExpirationTime('5m')
                .sign(privateKey)
            : undefined
          response.end(
            JSON.stringify({
              access_token: 'renewed-access-token',
              refresh_token: refreshToken,
              token_type: 'Bearer',
              expires_in: 300,
              ...(idToken ? { id_token: idToken } : {})
            })
          )
          return
        }
        pkceVerified =
          createHash('sha256')
            .update(form.get('code_verifier') ?? '')
            .digest('base64url') === authorization?.searchParams.get('code_challenge') &&
          form.get('redirect_uri') === authorization?.searchParams.get('redirect_uri') &&
          form.get('code') === 'one-time-code'
        if (!pkceVerified) {
          response.writeHead(400)
          response.end('{}')
          return
        }
        const idToken = await new SignJWT({
          nonce: options.nonce ?? authorization!.searchParams.get('nonce'),
          ...(options.userInfoOnly ? {} : { name: 'Alice', email: 'alice@company.internal' })
        })
          .setProtectedHeader({ alg: 'RS256' })
          .setIssuer(base)
          .setAudience(options.audience ?? 'desktop-test-client')
          .setSubject(options.subject ?? 'employee-7')
          .setIssuedAt()
          .setExpirationTime('5m')
          .sign(privateKey)
        response.end(
          JSON.stringify({
            access_token: 'company-access-token',
            ...(options.refreshable === false ? {} : { refresh_token: 'company-refresh-token' }),
            token_type: 'Bearer',
            expires_in: 300,
            id_token: idToken
          })
        )
      } else {
        response.writeHead(404)
        response.end('{}')
      }
    })().catch(() => {
      response.writeHead(500)
      response.end('{}')
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('No fixture port')
  }
  base = `http://127.0.0.1:${address.port}`
  const callbackProbe = createServer()
  await new Promise<void>((resolve) => callbackProbe.listen(0, '127.0.0.1', resolve))
  const callbackAddress = callbackProbe.address()
  if (!options.occupiedCallbackPort) {
    await new Promise<void>((resolve) => callbackProbe.close(() => resolve()))
  }
  if (!callbackAddress || typeof callbackAddress === 'string') {
    throw new Error('No callback fixture port')
  }
  let settings: IntranetSsoSettings = {
    ...defaultIntranetSsoSettings(),
    enabled: true,
    callbackPort: callbackAddress.port,
    issuer: base,
    clientId: 'desktop-test-client',
    clientSecretEnv: options.authMethod ? 'TEST_BADA_SECRET' : '',
    tokenEndpointAuthMethod: options.authMethod ?? 'none',
    protocol: options.protocol ?? 'oidc',
    authorizationUrl: `${base}/authorize`,
    tokenUrl: `${base}/token`,
    userInfoUrl: `${base}/profile`,
    subjectClaim: 'uid'
  }
  const ports: ConstructorParameters<typeof IntranetSsoService>[0] = {
    settings: () => settings,
    provider: options.provider,
    clientSecret: options.clientSecret,
    session: {
      read: () => retained,
      save: (_key, identity) => {
        identities.push(identity)
        retained = identity
        return true
      },
      clear: () => {
        retained = null
      }
    },
    openBrowser: async (value) => {
      authorization = new URL(value)
      const target = new URL(authorization.searchParams.get('redirect_uri')!)
      target.searchParams.set('code', 'one-time-code')
      target.searchParams.set('state', authorization.searchParams.get('state')!)
      if (options.strayState) {
        const stray = new URL(target)
        stray.searchParams.set('state', 'another-login')
        const response = await fetch(stray)
        await response.text()
        if (response.status !== 400 || service.status().state !== 'authorizing') {
          throw new Error('Stray callback ended sign-in')
        }
      }
      callback = fetch(target).then((response) => response.text())
    }
  }
  const service = new IntranetSsoService(ports)
  return {
    service,
    identities,
    refreshReceived: refreshReceived.promise,
    reopen: () => new IntranetSsoService(ports),
    get pkceVerified() {
      return pkceVerified
    },
    get retained() {
      return retained
    },
    setSettings: (next: Partial<IntranetSsoSettings>) => {
      settings = { ...settings, ...next }
      service.status()
    },
    async close() {
      service.cancel()
      await callback?.catch(() => undefined)
      if (callbackProbe.listening) {
        callbackProbe.closeAllConnections()
        await new Promise<void>((resolve) => callbackProbe.close(() => resolve()))
      }
      server.closeAllConnections()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  }
}
