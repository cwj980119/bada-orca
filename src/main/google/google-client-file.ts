import type { GoogleClientConfig } from '../../shared/google/google-client-config'

export type ParsedGoogleClient =
  | { ok: true; clientId: string; clientSecret: string; projectId?: string }
  | { ok: false; message: string }

export function parseGoogleClientFile(_text: string): ParsedGoogleClient {
  throw new Error('This service is not included in the internal edition.')
}

export function googleClientFile(
  _config: Pick<GoogleClientConfig, 'clientId' | 'clientSecret' | 'projectId'>
): string {
  throw new Error('This service is not included in the internal edition.')
}
