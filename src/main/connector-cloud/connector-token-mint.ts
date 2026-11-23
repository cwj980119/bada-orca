import type { OrcaCloudAuthConfig } from '../orca-profiles/cloud-auth/profile-cloud-auth-config'

import type { ConnectorTokenMint } from './connector-transport'

export const CONNECTOR_HOST_KEY_CAPABILITY = 'connector.hostKey'

export function connectorAccount(_userDataPath: string): string | null {
  throw new Error('This service is not included in the internal edition.')
}

export function connectorAccountName(_userDataPath: string): string {
  throw new Error('This service is not included in the internal edition.')
}

export function desktopConnectorTokenMint(
  _authConfig: OrcaCloudAuthConfig,
  _userDataPath: string,
  _account: string,
  _fetchImpl: typeof globalThis.fetch = globalThis.fetch
): ConnectorTokenMint {
  throw new Error('This service is not included in the internal edition.')
}
