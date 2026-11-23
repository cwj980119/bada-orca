import type { AddressLookup } from './oauth-endpoint-address'

export type OAuthFetch = (url: string | URL, init?: RequestInit) => Promise<Response>

export class OAuthFetchRefused extends Error {
  constructor(
    readonly code:
      | 'insecure'
      | 'private-endpoint'
      | 'lookup-failed'
      | 'redirect-origin'
      | 'too-many-redirects'
      | 'too-large'
      | 'timeout',
    readonly origin: string
  ) {
    super(`OAuth request to ${origin} refused: ${code}`)
  }
}

/** https, or http to this machine (RFC 8252 §7.3); anything else would put a credential on the wire. */
export const isSecureOAuthEndpoint = (_url: URL): boolean => {
  throw new Error('This service is not included in the internal edition.')
}

export type SecureOAuthFetchOptions = {
  /** The app's MCP address: while it is public, every OAuth endpoint must be public too. */
  resource: string
  signal?: AbortSignal
  lookup?: AddressLookup
  /** The transport underneath; Orca's own HTTP client (and its proxy settings) by default. */
  fetch?: OAuthFetch
  deadlineMs?: number
}

export function secureOAuthFetch(_options: SecureOAuthFetchOptions): OAuthFetch {
  throw new Error('This service is not included in the internal edition.')
}

/** `work`, or a rejection with `reason()` as soon as `signal` aborts. */

/** The response with its whole body read, refusing one past the limit or the deadline. */
