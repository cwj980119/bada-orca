export function isIntranetHostEntry(value: string): boolean {
  if (value.includes('/')) {
    const [address, prefix, extra] = value.split('/')
    return (
      extra === undefined &&
      validIpv4(address) &&
      /^\d{1,2}$/.test(prefix ?? '') &&
      Number(prefix) >= 8 &&
      Number(prefix) <= 32
    )
  }
  if (value.includes(':')) {
    try {
      const host = value.replace(/^\[|\]$/g, '')
      return new URL(`http://[${host}]/`).hostname.length > 0
    } catch {
      return false
    }
  }
  if (/^[\d.]+$/.test(value)) {
    return validIpv4(value)
  }
  return value
    .replace(/\.$/, '')
    .split('.')
    .every((label) => /^[a-zA-Z0-9_](?:[a-zA-Z0-9_-]{0,61}[a-zA-Z0-9_])?$/.test(label))
}

function validIpv4(value: string): boolean {
  const parts = value.split('.')
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}
