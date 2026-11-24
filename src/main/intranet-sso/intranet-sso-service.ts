import { createHash, randomBytes } from 'node:crypto'
import {
  INTRANET_SSO_CALLBACK_PATH,
  intranetSsoCallbackPort,
  IntranetSsoSettingsSchema,
  type IntranetSsoIdentity,
  type IntranetSsoSettings,
  type IntranetSsoStatus,
  type IntranetSsoSession,
  type IntranetSsoTokens,
  type BadaCredentials
} from '../../shared/intranet/intranet-sso'
import { serveHeldLoopbackCallback } from '../orca-profiles/cloud-auth/loopback-callback'
import { IntranetSsoError, IntranetSsoProviderClient } from './intranet-sso-provider'
import { ssoConfigurationKey } from './intranet-sso-session'
import {
  orcaCallbackReceivedPage,
  orcaCallbackOutcome
} from '../orca-profiles/cloud-auth/profile-cloud-callback-page'

type SessionPort = {
  read(key: string): IntranetSsoSession | null
  save(key: string, session: IntranetSsoSession): boolean
  clear(): void
}

const PAGE = orcaCallbackReceivedPage({
  brand: 'ORCA · BADA',
  heading: '로그인을 마무리하고 있어요',
  line: '계정 정보를 확인하는 동안 잠시만 기다려 주세요.'
})
const SUCCESS = orcaCallbackOutcome({
  ok: true,
  brand: 'ORCA · BADA',
  heading: 'BADA 로그인 완료',
  line: '이제 Orca 앱으로 돌아가 작업을 이어가세요. 이 창은 닫아도 괜찮습니다.'
})
const FAILED = orcaCallbackOutcome({
  ok: false,
  brand: 'ORCA · BADA',
  heading: '로그인을 완료하지 못했어요',
  line: 'Orca 앱으로 돌아가 BADA 로그인을 다시 시도해 주세요.'
})

export class IntranetSsoService {
  private identity: IntranetSsoIdentity | null = null
  private tokens: IntranetSsoTokens | null = null
  private persistence: IntranetSsoStatus['persistence'] = 'memory'
  private controller: AbortController | null = null
  private error: string | null = null
  private fingerprint: string | null = null

  constructor(
    private readonly ports: {
      settings: () => IntranetSsoSettings
      openBrowser: (url: string) => Promise<void>
      session: SessionPort
      provider?: IntranetSsoProviderClient
      clientSecret?: () => string
    }
  ) {}

  status(): IntranetSsoStatus {
    const config = this.ports.settings()
    const key = ssoConfigurationKey(config)
    if (this.fingerprint !== key) {
      const initial = this.fingerprint === null
      this.cancel()
      const session = initial && config.enabled ? this.ports.session.read(key) : null
      this.identity = session?.tokens ? session.identity : null
      this.tokens = session?.tokens ?? null
      this.persistence = this.identity ? 'encrypted' : 'memory'
      this.fingerprint = key
      if (!initial) {
        try {
          this.ports.session.clear()
        } catch {
          this.error = 'storage_failed'
        }
      }
    }
    return {
      state: !config.enabled
        ? 'unconfigured'
        : this.controller
          ? 'authorizing'
          : this.error
            ? 'error'
            : this.identity
              ? this.identity.expiresAt > Date.now()
                ? 'signed-in'
                : 'expired'
              : 'signed-out',
      identity: this.identity,
      persistence: this.persistence,
      error: this.error
    }
  }

  start(clientSecret?: string): IntranetSsoStatus {
    this.status()
    const config = IntranetSsoSettingsSchema.parse(this.ports.settings())
    if (!config.enabled) {
      throw new IntranetSsoError('unconfigured')
    }
    this.cancel()
    const controller = new AbortController()
    this.controller = controller
    const key = ssoConfigurationKey(config)
    const current = () =>
      this.controller === controller &&
      !controller.signal.aborted &&
      ssoConfigurationKey(this.ports.settings()) === key
    void this.authorize(config, controller.signal, clientSecret ?? this.ports.clientSecret?.())
      .then((session) => {
        if (!current()) {
          return
        }
        this.identity = session.identity
        this.tokens = session.tokens ?? null
        this.controller = null
      })
      .catch((error: unknown) => {
        if (!current()) {
          return
        }
        this.controller = null
        if (
          error instanceof Error &&
          'code' in error &&
          (error.code === 'EADDRINUSE' || error.code === 'EACCES')
        ) {
          this.error = 'callback_unavailable'
          return
        }
        this.error =
          error instanceof IntranetSsoError ||
          (error instanceof Error &&
            ['timeout', 'cancelled', 'callback_unavailable', 'callback_failed'].includes(
              error.message
            ))
            ? error.message
            : 'sign_in_failed'
      })
    return this.status()
  }

  cancel(): void {
    const controller = this.controller
    this.controller = null
    controller?.abort()
    this.error = null
  }

  signOut(): IntranetSsoStatus {
    this.cancel()
    this.identity = null
    this.tokens = null
    this.persistence = 'memory'
    this.ports.session.clear()
    return this.status()
  }

  credentials(): BadaCredentials | null {
    const status = this.status()
    if (
      status.state !== 'signed-in' ||
      !status.identity ||
      !this.tokens ||
      this.tokens.expiresAt <= Date.now()
    ) {
      return null
    }
    return { ...status.identity, ...this.tokens }
  }

  private async authorize(
    config: IntranetSsoSettings,
    signal: AbortSignal,
    clientSecret?: string
  ): Promise<IntranetSsoSession> {
    const providerClient = this.ports.provider ?? new IntranetSsoProviderClient()
    providerClient.assertCredentials(config, clientSecret)
    const provider = await providerClient.discover(config, signal)
    const verifier = randomBytes(32).toString('base64url')
    const state = randomBytes(32).toString('base64url')
    const nonce = randomBytes(32).toString('base64url')
    let redirectUri = ''
    const returned = await serveHeldLoopbackCallback<string>({
      path: INTRANET_SSO_CALLBACK_PATH,
      rejectedPage: PAGE + FAILED,
      port: intranetSsoCallbackPort(config.callbackPort),
      timeoutMs: 5 * 60_000,
      signal,
      errors: {
        timeout: 'timeout',
        cancelled: 'cancelled',
        unavailable: 'callback_unavailable',
        failed: 'callback_failed'
      },
      hold: { received: PAGE, pending: FAILED, ms: 45_000 },
      read: (url) => {
        if (
          url.searchParams.getAll('state').length !== 1 ||
          url.searchParams.get('state') !== state
        ) {
          return { kind: 'stray', message: 'Invalid sign-in state.' }
        }
        if (url.searchParams.has('iss') && url.searchParams.get('iss') !== provider.issuer) {
          return {
            kind: 'reject',
            error: new IntranetSsoError('invalid_issuer'),
            message: 'Invalid issuer.'
          }
        }
        if (url.searchParams.has('error')) {
          return {
            kind: 'reject',
            error: new IntranetSsoError(
              url.searchParams.get('error') === 'access_denied' ? 'denied' : 'sign_in_failed'
            ),
            message: 'Sign-in was not completed. Return to the app.'
          }
        }
        const code = url.searchParams.get('code')
        if (!code || code.length > 4096 || url.searchParams.getAll('code').length !== 1) {
          return { kind: 'stray', message: 'Missing authorization code.' }
        }
        return { kind: 'accept', value: code }
      },
      onListening: async (port) => {
        redirectUri = `http://127.0.0.1:${port}${INTRANET_SSO_CALLBACK_PATH}`
        const url = new URL(provider.authorizationUrl)
        for (const [key, value] of Object.entries({
          client_id: config.clientId,
          response_type: 'code',
          redirect_uri: redirectUri,
          scope: config.scopes,
          state,
          nonce,
          code_challenge: createHash('sha256').update(verifier).digest('base64url'),
          code_challenge_method: 'S256'
        })) {
          url.searchParams.set(key, value)
        }
        await this.ports.openBrowser(url.href)
      }
    })
    try {
      const session = await providerClient.exchange(
        config,
        provider,
        { code: returned.value, verifier, nonce, redirectUri, clientSecret },
        signal
      )
      if (
        signal.aborted ||
        ssoConfigurationKey(this.ports.settings()) !== ssoConfigurationKey(config)
      ) {
        throw new IntranetSsoError('cancelled')
      }
      try {
        const persisted = this.ports.session.save(ssoConfigurationKey(config), session)
        if (!persisted) {
          this.ports.session.clear()
        }
        this.persistence = persisted ? 'encrypted' : 'memory'
      } catch {
        throw new IntranetSsoError('storage_failed')
      }
      returned.answer(SUCCESS)
      return session
    } catch (error) {
      returned.answer(FAILED)
      throw error
    }
  }
}
