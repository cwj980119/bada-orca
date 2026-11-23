import type { WslHostsPolicy } from '../../../shared/remote-runtime/wsl-hosts/wsl-hosts-policy'

export type WslHostsPolicyChannel = 'next' | 'stable'

export function wslHostsPolicyChannelForAppVersion(
  _appVersion: string
): WslHostsPolicyChannel | null {
  return null
}

export function wslHostsPolicyDownloadUrl(_channel: WslHostsPolicyChannel): string {
  throw new Error('This service is not included in the internal edition.')
}

export function wslHostsPolicyCacheFileName(_channel: WslHostsPolicyChannel): string {
  throw new Error('This service is not included in the internal edition.')
}

export function readCachedWslHostsPolicy(
  _userDataPath: string,
  _appVersion: string
): WslHostsPolicy | null {
  return null
}

export type WslHostsPolicyLiveUpdateDeps = {
  userDataPath: string
  appVersion: string

  isPackaged: boolean
  fetch: (url: string, init?: RequestInit) => Promise<Response>

  onBlock?: () => void
}

export class WslHostsPolicyLiveUpdater {
  constructor(_deps: WslHostsPolicyLiveUpdateDeps) {}

  async start(): Promise<void> {}

  stop(): void {}

  async refresh(): Promise<void> {}
}

export function startWslHostsPolicyLiveUpdates(): void {}
