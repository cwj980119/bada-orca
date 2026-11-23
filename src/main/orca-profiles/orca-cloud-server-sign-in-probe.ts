import type { OrcaCloudAuthConfig } from './cloud-auth/profile-cloud-auth-config'

export type OrcaServerSignInProbe = (
  config: Pick<OrcaCloudAuthConfig, 'apiBaseUrl'>,
  clientId: string
) => Promise<boolean>

export async function probeOrcaServerSignIn(
  _config: Pick<OrcaCloudAuthConfig, 'apiBaseUrl'>,
  _clientId: string
): Promise<boolean> {
  throw new Error('This service is not included in the internal edition.')
}
