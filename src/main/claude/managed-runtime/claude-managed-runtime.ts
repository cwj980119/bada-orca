import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod'

import type { ManagedRuntime, ManagedRuntimePin } from '../../node-runtime/managed-runtime-release'
import { followLatestRelease } from '../../node-runtime/managed-runtime-latest-release'
import { requireRuntimeAnswersVersion } from '../../node-runtime/managed-runtime-version-check'

export function claudeManagedPlatform(
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
  musl: boolean = isMuslHost()
): string | null {
  if (arch !== 'x64' && arch !== 'arm64') {
    return null
  }
  if (platform === 'darwin' || platform === 'win32') {
    return `${platform}-${arch}`
  }
  return platform === 'linux' ? `linux-${arch}${musl ? '-musl' : ''}` : null
}

let muslHost: boolean | undefined

// Building a process report is slow and synchronous, and the libc can't change while running.
function isMuslHost(): boolean {
  if (process.platform !== 'linux') {
    return false
  }
  if (muslHost === undefined) {
    // glibc builds report their runtime glibc version; musl builds have none.
    const report: unknown = process.report?.getReport()
    const header = report && typeof report === 'object' && 'header' in report ? report.header : null
    muslHost = !(header && typeof header === 'object' && 'glibcVersionRuntime' in header)
  }
  return muslHost
}

const channelSettingsSchema = z.object({
  autoUpdatesChannel: z.enum(['latest', 'stable']).optional()
})

/** Claude's own `autoUpdatesChannel`; managed settings win over the user's, and Claude defaults to latest. */
export async function claudeUpdateChannel(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform
): Promise<'latest' | 'stable'> {
  const configDir = env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude')
  const managed =
    platform === 'darwin'
      ? '/Library/Application Support/ClaudeCode'
      : platform === 'win32'
        ? join(env.PROGRAMFILES || 'C:\\Program Files', 'ClaudeCode')
        : '/etc/claude-code'
  const channels = await Promise.all(
    [join(configDir, 'settings.json'), join(managed, 'managed-settings.json')].map(async (path) => {
      try {
        return channelSettingsSchema.safeParse(JSON.parse(await readFile(path, 'utf8'))).data
          ?.autoUpdatesChannel
      } catch {
        return undefined
      }
    })
  )
  return channels.findLast((channel) => channel !== undefined) ?? 'latest'
}

async function fetchLatestPin(_signal?: AbortSignal): Promise<ManagedRuntimePin | null> {
  throw new Error('This service is not included in the internal edition.')
}

async function validateClaudeRelease(
  folder: string,
  pin: ManagedRuntimePin,
  signal: AbortSignal
): Promise<void> {
  await requireRuntimeAnswersVersion(
    claudeManagedExecutable(folder),
    'Claude',
    pin.version,
    (answered) => answered.startsWith(pin.version),
    signal
  )
}

export const CLAUDE_MANAGED_RUNTIME: ManagedRuntime = {
  label: 'Claude',
  root: (dataDirectory) => join(dataDirectory, 'agent-runtimes', 'claude'),
  ...followLatestRelease(fetchLatestPin),
  validate: validateClaudeRelease
}

/** The executable inside a Claude release folder. */
export function claudeManagedExecutable(folder: string): string {
  return join(folder, process.platform === 'win32' ? 'claude.exe' : 'claude')
}
