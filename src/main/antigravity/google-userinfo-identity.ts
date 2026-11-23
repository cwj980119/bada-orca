import type { AntigravityCredentialIdentity } from './native-credential-codec'

export async function fetchGoogleIdentity(
  _accessToken: string
): Promise<AntigravityCredentialIdentity> {
  throw new Error('This service is not included in the internal edition.')
}
