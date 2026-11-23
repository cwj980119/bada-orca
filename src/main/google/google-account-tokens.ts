import type { GoogleAccountRecord } from './google-credential-store'
import { defaultGoogleHttp, type GoogleHttp } from './google-token-endpoint'

export type GoogleTokenDeps = { http: GoogleHttp; now: () => number }
export const defaultGoogleTokenDeps: GoogleTokenDeps = { http: defaultGoogleHttp, now: Date.now }

export class GoogleAccountUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GoogleAccountUnavailableError'
  }
}

export function markGoogleAccountReconnect(
  _record: GoogleAccountRecord,
  _reason: string
): GoogleAccountRecord {
  throw new Error('This service is not included in the internal edition.')
}

export async function refreshGoogleAccount(
  _email: string,
  _deps: GoogleTokenDeps = defaultGoogleTokenDeps,
  _force = false
): Promise<GoogleAccountRecord> {
  throw new Error('This service is not included in the internal edition.')
}

export async function googleAccessToken(
  _email: string,
  _deps: GoogleTokenDeps = defaultGoogleTokenDeps
): Promise<string> {
  throw new Error('This service is not included in the internal edition.')
}
