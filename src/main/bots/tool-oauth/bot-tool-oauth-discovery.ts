import type { AuthorizationServerMetadata } from '@modelcontextprotocol/sdk/shared/auth.js'

import type { OAuthFetch } from './secure-oauth-fetch'
import type { AddressLookup } from './oauth-endpoint-address'

export type BotToolAuthServer = {
  issuer: string
  metadata: AuthorizationServerMetadata

  resource: string
  resourceMetadataUrl?: string
  scope?: string
}

export type BotToolAuthNeed =
  | { kind: 'none' }
  | ({ kind: 'oauth' } & BotToolAuthServer)
  | { kind: 'unsupported' }
  | { kind: 'unavailable' }

export type BotToolDiscoveryOptions = {
  signal?: AbortSignal
  lookup?: AddressLookup
  fetch?: OAuthFetch
}

export async function issuerMetadata(
  _issuer: string,
  _fetchFn: OAuthFetch
): Promise<AuthorizationServerMetadata | undefined> {
  throw new Error('This service is not included in the internal edition.')
}

export async function discoverBotToolAuth(
  _url: string,
  _options: BotToolDiscoveryOptions = {}
): Promise<BotToolAuthNeed> {
  throw new Error('This service is not included in the internal edition.')
}

export async function findAuthServer(
  _url: string,
  _challenge: { resourceMetadataUrl?: URL; scope?: string },
  _options: BotToolDiscoveryOptions,
  _required: boolean
): Promise<BotToolAuthServer | 'none' | 'unsupported'> {
  throw new Error('This service is not included in the internal edition.')
}
