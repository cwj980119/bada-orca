export type HostOAuthRefreshDeps = { now: () => number; request: typeof fetch }
export const defaultHostOAuthRefreshDeps: HostOAuthRefreshDeps = {
  now: Date.now,
  request: async () => {
    throw new Error('Hosted account refresh is not part of the internal edition.')
  }
}

export type HostOAuthGrant = {
  refreshToken: string
  expiresAt: number
  clientId: string
  clientSecret?: string
}

export type HostOAuthRefreshed = {
  accessToken: string
  refreshToken: string
  expiresAt: number

  scope?: string
}

export type HostOAuthRefreshOutcome =
  | 'none'
  | 'fresh'
  | 'refreshed'
  | 'offline'
  | 'ended'
  | 'superseded'

export type HostOAuthRefresherConfig<TLogin> = {
  tokenUrl: string
  refreshAheadMs: number

  endedErrors?: readonly string[]

  rotates: boolean
  read: (id: string) => TLogin | null

  grantOf: (login: TLogin) => HostOAuthGrant | null

  save: (id: string, login: TLogin, refreshed: HostOAuthRefreshed) => void
  ended: (id: string, login: TLogin, error: string) => void
}

export type HostOAuthRefresher = {
  refresh: (
    id: string,
    deps?: HostOAuthRefreshDeps,
    force?: boolean
  ) => Promise<HostOAuthRefreshOutcome>
  isDue: (grant: Pick<HostOAuthGrant, 'expiresAt'>, now: number) => boolean
}

export function createHostOAuthRefresher<TLogin>(
  _config: HostOAuthRefresherConfig<TLogin>
): HostOAuthRefresher {
  throw new Error('This service is not included in the internal edition.')
}
