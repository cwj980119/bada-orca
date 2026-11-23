export type GoogleHttp = typeof fetch
export const defaultGoogleHttp: GoogleHttp = (_input, _init) => {
  throw new Error('This service is not included in the internal edition.')
}

export type GoogleClientSecret = { clientId: string; clientSecret: string }

export type GoogleTokens = {
  accessToken: string
  expiresIn: number
  refreshToken?: string

  scope?: string
  idToken?: string
}

export class GoogleTokenError extends Error {
  constructor(
    readonly code: string,
    readonly _status: number,
    description?: string
  ) {
    super(description ? `${code}: ${description}` : code)
    this.name = 'GoogleTokenError'
  }
}

export async function exchangeGoogleCode(
  _http: GoogleHttp,
  _client: GoogleClientSecret,
  _args: { code: string; codeVerifier: string; redirectUri: string },
  _signal?: AbortSignal
): Promise<GoogleTokens> {
  throw new Error('This service is not included in the internal edition.')
}

/** Cancels the grant at Google; true when Google confirmed or already had none. */
export async function revokeGoogleToken(_http: GoogleHttp, _token: string): Promise<boolean> {
  throw new Error('This service is not included in the internal edition.')
}

/**
 * The signed-in account (Google's stable id, and the address shown) from the id token Google's
 * token endpoint just returned over TLS to this host, which OpenID Connect lets a client trust
 * without checking the signature.
 */
export function accountFromIdToken(
  _idToken: string | undefined
): { sub: string; email: string } | null {
  throw new Error('This service is not included in the internal edition.')
}
