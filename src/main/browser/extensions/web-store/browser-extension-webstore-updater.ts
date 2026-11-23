import { isAllowedCrxDownloadUrl } from './browser-extension-webstore-download'

const RESPONSE_PREFIX = ")]}'"

export type BrowserExtensionUpdate = {
  extensionId: string
  version: string
  url: string
  sha256: string | undefined
  size: number | undefined
}

export function compareExtensionVersions(a: string, b: string): number {
  const left = a.split('.').map((part) => Number.parseInt(part, 10) || 0)
  const right = b.split('.').map((part) => Number.parseInt(part, 10) || 0)
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0)
    if (difference !== 0) {
      return Math.sign(difference)
    }
  }
  return 0
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : {}
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

export function parseOmahaUpdateResponse(
  text: string,
  installedVersions: ReadonlyMap<string, string>
): BrowserExtensionUpdate[] {
  const body = text.startsWith(RESPONSE_PREFIX) ? text.slice(RESPONSE_PREFIX.length) : text
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    return []
  }
  const updates: BrowserExtensionUpdate[] = []
  for (const app of list(record(record(parsed).response).app)) {
    const entry = record(app)
    const updateCheck = record(entry.updatecheck)
    const extensionId = entry.appid
    const installed =
      typeof extensionId === 'string' ? installedVersions.get(extensionId) : undefined
    const manifest = record(updateCheck.manifest)
    const pkg = record(list(record(manifest.packages).package)[0])
    const codebase = record(list(record(updateCheck.urls).url)[0]).codebase
    if (
      typeof extensionId !== 'string' ||
      installed === undefined ||
      updateCheck.status !== 'ok' ||
      typeof manifest.version !== 'string' ||
      typeof pkg.name !== 'string' ||
      typeof codebase !== 'string' ||
      compareExtensionVersions(manifest.version, installed) <= 0
    ) {
      continue
    }
    let url: string
    try {
      url = new URL(pkg.name, codebase).toString()
    } catch {
      continue
    }
    if (!isAllowedCrxDownloadUrl(url)) {
      continue
    }
    updates.push({
      extensionId,
      version: manifest.version,
      url,
      sha256: typeof pkg.hash_sha256 === 'string' ? pkg.hash_sha256 : undefined,
      size: typeof pkg.size === 'number' ? pkg.size : undefined
    })
  }
  return updates
}

export async function reviewHeldBrowserExtensionUpdate(
  _extensionId: string,
  _renderer: Electron.WebContents
): Promise<void> {
  throw new Error('This service is not included in the internal edition.')
}

export async function checkForBrowserExtensionUpdates(): Promise<void> {}

export function startBrowserExtensionUpdateChecks(): void {}
