import type { GoogleServiceReadiness } from '../../shared/google/google-connect-types'
import type { GoogleService, GoogleServiceChoice } from '../../shared/google/google-scopes'
import type { GoogleHttp } from './google-token-endpoint'

export type GoogleApiError = {
  status: number
  message: string
  reasons: string[]
  activationUrl?: string
}

export function readGoogleApiError(_status: number, _body: unknown): GoogleApiError {
  throw new Error('This service is not included in the internal edition.')
}

export function classifyGoogleApiError(
  _service: GoogleService,
  _error: GoogleApiError,
  _projectId?: string
): GoogleServiceReadiness {
  throw new Error('This service is not included in the internal edition.')
}

export async function checkGoogleServices(_args: {
  http: GoogleHttp
  accessToken: string
  grantedScopes: readonly string[]
  choices: readonly GoogleServiceChoice[]
  projectId?: string
}): Promise<GoogleServiceReadiness[]> {
  throw new Error('This service is not included in the internal edition.')
}
