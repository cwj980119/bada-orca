import { Socket } from 'node:net'
import { syncBuiltinESMExports } from 'node:module'
import { isIntranetHost, isIntranetUrl } from '../../shared/intranet/intranet-network-policy'
import { intranetAllowedHosts, readIntranetSettings } from '../../shared/intranet/intranet-settings'

let settingsReader: (() => unknown) | undefined
let installed = false

export function configureIntranetNetwork(reader: () => unknown): void {
  settingsReader = reader
  process.env.ORCA_INTRANET_ALLOWED_HOSTS = JSON.stringify(
    intranetAllowedHosts(readIntranetSettings(reader()))
  )
}

function allowedHosts(): string[] {
  if (settingsReader) {
    return intranetAllowedHosts(readIntranetSettings(settingsReader()))
  }
  try {
    const value: unknown = JSON.parse(process.env.ORCA_INTRANET_ALLOWED_HOSTS ?? '[]')
    return Array.isArray(value)
      ? value.filter((entry): entry is string => typeof entry === 'string')
      : []
  } catch {
    return []
  }
}

export function intranetRequestAllowed(url: string): boolean {
  const settings = readIntranetSettings(settingsReader?.())
  return isIntranetUrl(url, { ...settings, allowedHosts: allowedHosts() })
}

export function assertIntranetRequest(url: string): void {
  if (!intranetRequestAllowed(url)) {
    throw new Error(
      'External connections are disabled. Add this internal server in Intranet settings.'
    )
  }
}

function socketHostname(args: unknown[]): string | null {
  const first = Array.isArray(args[0]) ? args[0][0] : args[0]
  if (typeof first === 'object' && first !== null) {
    if ('path' in first && typeof first.path === 'string') {
      return null
    }
    return 'host' in first && typeof first.host === 'string' ? first.host : 'localhost'
  }
  if (typeof first === 'string' && !/^\d+$/.test(first)) {
    return null
  }
  return typeof args[1] === 'string' ? args[1] : 'localhost'
}

export function installIntranetNodeNetworkGuard(): void {
  if (installed) {
    return
  }
  installed = true
  const connect = Socket.prototype.connect
  Socket.prototype.connect = function (this: Socket, ...args: unknown[]): Socket {
    const host = socketHostname(args)
    if (host !== null && !isIntranetHost(host, allowedHosts())) {
      queueMicrotask(() =>
        this.destroy(new Error('External socket connections are disabled by the intranet policy.'))
      )
      return this
    }
    return Reflect.apply(connect, this, args)
  } as Socket['connect']
  syncBuiltinESMExports()
  const fetch = globalThis.fetch
  globalThis.fetch = (input, init) => {
    try {
      assertIntranetRequest(
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      )
      return fetch(input, init)
    } catch (error) {
      return Promise.reject(error)
    }
  }
}

installIntranetNodeNetworkGuard()
