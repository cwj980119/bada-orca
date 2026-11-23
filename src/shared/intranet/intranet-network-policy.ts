import type { IntranetSettings } from './intranet-settings'
import { intranetAllowedHosts } from './intranet-settings'

function hostname(value: string): string {
  return value
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '')
}

function ipv4(value: string): number | null {
  const parts = value.split('.')
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) {
    return null
  }
  return parts.reduce((result, part) => result * 256 + Number(part), 0)
}

function inRange(address: number, cidr: string): boolean {
  const [base, bits, extra] = cidr.split('/')
  const network = ipv4(base)
  if (network === null || extra !== undefined || !/^\d{1,2}$/.test(bits ?? '')) {
    return false
  }
  const prefix = Number(bits)
  if (prefix < 8 || prefix > 32) {
    return false
  }
  const size = 2 ** (32 - prefix)
  return Math.floor(address / size) === Math.floor(network / size)
}

export function isIntranetHost(host: string, allowedHosts: readonly string[] = []): boolean {
  const normalized = hostname(host)
  if (normalized === 'localhost' || normalized === '::1') {
    return true
  }
  const address = ipv4(normalized)
  if (
    address !== null &&
    ['127.0.0.0/8', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'].some((range) =>
      inRange(address, range)
    )
  ) {
    return true
  }
  if (/^f[cd][0-9a-f]{2}:/.test(normalized)) {
    return true
  }
  return allowedHosts.some((entry) =>
    entry.includes('/')
      ? address !== null && inRange(address, entry)
      : normalized === hostname(entry)
  )
}

export function isIntranetUrl(value: string, settings: IntranetSettings): boolean {
  try {
    const url = new URL(value)
    if (
      ['file:', 'data:', 'blob:', 'about:', 'devtools:', 'chrome-extension:'].includes(url.protocol)
    ) {
      return true
    }
    if (!['http:', 'https:', 'ws:', 'wss:', 'ftp:'].includes(url.protocol)) {
      return !url.protocol.startsWith('http') && url.protocol.startsWith('orca-')
    }
    return isIntranetHost(url.hostname, intranetAllowedHosts(settings))
  } catch {
    return false
  }
}
