import type { RelayRegionCatalog } from './relay-region-probe'

export async function fetchRelayRegionCatalog(
  _directorUrl: string,
  _fetch: typeof globalThis.fetch,
  _timeoutMs: number
): Promise<RelayRegionCatalog> {
  throw new Error('This service is not included in the internal edition.')
}

export function relayDirectorHost(_directorUrl: string): string {
  throw new Error('This service is not included in the internal edition.')
}
