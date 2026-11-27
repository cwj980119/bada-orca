import {
  IntranetSsoSettingsSchema,
  type IntranetSsoIdentity,
  type IntranetSsoSettings,
  type IntranetSsoStatus,
  type IntranetSsoSession,
  type IntranetSsoTokens,
  type BadaCredentials
} from '../../shared/intranet/intranet-sso'
import { IntranetSsoError, IntranetSsoProviderClient } from './intranet-sso-provider'
import { ssoConfigurationKey } from './intranet-sso-session'
import { authorizeIntranetSso } from './intranet-sso-authorization'

type SessionPort = {
  read(key: string): IntranetSsoSession | null
  save(key: string, session: IntranetSsoSession): boolean
  clear(): void
}

export class IntranetSsoService {
  private identity: IntranetSsoIdentity | null = null
  private tokens: IntranetSsoTokens | null = null
  private persistence: IntranetSsoStatus['persistence'] = 'memory'
  private controller: AbortController | null = null
  private error: string | null = null
  private fingerprint: string | null = null
  private clientSecret: string | undefined
  private nonce: string | undefined
  private refreshTimer: ReturnType<typeof setTimeout> | null = null
  private refreshing: { controller: AbortController; promise: Promise<void> } | null = null
  private refreshAfter = 0

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
      this.clientSecret = session?.clientSecret
      this.nonce = session?.nonce
      this.persistence = this.identity ? 'encrypted' : 'memory'
      this.fingerprint = key
      this.scheduleRefresh()
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
      error: this.error,
      configuration: config,
      renewable: Boolean(this.tokens?.refreshToken)
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
    const secret = clientSecret || this.clientSecret || this.ports.clientSecret?.()
    void this.authorize(config, controller.signal, secret)
      .then((session) => {
        if (!current()) {
          return
        }
        this.identity = session.identity
        this.tokens = session.tokens ?? null
        this.clientSecret = session.clientSecret
        this.nonce = session.nonce
        this.controller = null
        this.scheduleRefresh()
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
    this.refreshing?.controller.abort()
    this.refreshing = null
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
    }
    this.refreshTimer = null
    this.refreshAfter = 0
    this.error = null
  }

  signOut(): IntranetSsoStatus {
    this.cancel()
    this.identity = null
    this.tokens = null
    this.clientSecret = undefined
    this.nonce = undefined
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
    const { refreshToken: _refreshToken, ...tokens } = this.tokens
    return { ...status.identity, ...tokens }
  }

  async ensureFresh(): Promise<IntranetSsoStatus> {
    this.status()
    if (this.refreshing) {
      await this.refreshing.promise
    } else if (
      !this.controller &&
      this.identity &&
      this.tokens?.refreshToken &&
      this.tokens.expiresAt <= Date.now() + 60_000 &&
      Date.now() >= this.refreshAfter
    ) {
      const controller = new AbortController()
      const key = this.fingerprint
      const session: IntranetSsoSession = {
        identity: this.identity,
        tokens: this.tokens,
        clientSecret: this.clientSecret || this.ports.clientSecret?.(),
        nonce: this.nonce
      }
      const current = () =>
        this.refreshing?.controller === controller &&
        !controller.signal.aborted &&
        ssoConfigurationKey(this.ports.settings()) === key
      const promise = Promise.resolve().then(async () => {
        try {
          const next = await (this.ports.provider ?? new IntranetSsoProviderClient()).refresh(
            this.ports.settings(),
            session,
            controller.signal
          )
          if (!current()) {
            return
          }
          this.persist(next)
          this.identity = next.identity
          this.tokens = next.tokens ?? null
          this.error = null
          this.refreshAfter = 0
        } catch (error) {
          if (!current()) {
            return
          }
          if (error instanceof IntranetSsoError && error.message === 'session_expired') {
            this.tokens = null
            this.clientSecret = undefined
            try {
              this.ports.session.clear()
              this.error = 'session_expired'
            } catch {
              this.error = 'storage_failed'
            }
          } else {
            this.refreshAfter = Date.now() + 30_000
            this.error = (this.tokens?.expiresAt ?? 0) <= Date.now() ? 'refresh_failed' : null
          }
        } finally {
          if (this.refreshing?.controller === controller) {
            this.refreshing = null
            this.scheduleRefresh()
          }
        }
      })
      this.refreshing = { controller, promise }
      await promise
    }
    return this.status()
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
    }
    this.refreshTimer = null
    if (!this.tokens?.refreshToken || this.controller) {
      return
    }
    const due = Math.max(this.refreshAfter, this.tokens.expiresAt - 60_000)
    this.refreshTimer = setTimeout(
      () => {
        this.refreshTimer = null
        void this.ensureFresh()
      },
      Math.min(Math.max(0, due - Date.now()), 24 * 60 * 60_000)
    )
    this.refreshTimer.unref?.()
  }

  private persist(session: IntranetSsoSession): void {
    try {
      const persisted = this.ports.session.save(ssoConfigurationKey(this.ports.settings()), session)
      if (!persisted) {
        this.ports.session.clear()
      }
      this.persistence = persisted ? 'encrypted' : 'memory'
    } catch {
      throw new IntranetSsoError('storage_failed')
    }
  }

  private authorize(
    config: IntranetSsoSettings,
    signal: AbortSignal,
    clientSecret?: string
  ): Promise<IntranetSsoSession> {
    return authorizeIntranetSso(
      {
        provider: this.ports.provider,
        openBrowser: (url) => this.ports.openBrowser(url),
        configurationKey: () => ssoConfigurationKey(this.ports.settings()),
        persist: (session) => this.persist(session)
      },
      config,
      signal,
      clientSecret
    )
  }
}
