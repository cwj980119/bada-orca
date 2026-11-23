import { fetchWithElectronManualRedirects } from '../../../host/electron-manual-redirect-fetch'

import type { VerifiedCrx } from '../installation/browser-extension-crx'

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>

export function isAllowedCrxDownloadUrl(_rawUrl: string): boolean {
  throw new Error('This service is not included in the internal edition.')
}

export function isAllowedWebStoreIconUrl(_rawUrl: string): boolean {
  throw new Error('This service is not included in the internal edition.')
}

export function chromeWebStoreCrxUrl(
  _extensionId: string,
  _chromeVersion: string = process.versions.chrome
): string {
  throw new Error('This service is not included in the internal edition.')
}

export async function downloadWebStoreCrx(
  _extensionId: string,
  _options: { url?: string; sha256?: string; size?: number; fetcher?: Fetcher } = {}
): Promise<VerifiedCrx> {
  throw new Error('This service is not included in the internal edition.')
}

export async function fetchWebStoreIconDataUrl(
  _iconUrl: string,
  _fetcher: Fetcher = fetchWithElectronManualRedirects
): Promise<string> {
  throw new Error('This service is not included in the internal edition.')
}
