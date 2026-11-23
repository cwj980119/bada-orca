import { join } from 'node:path'

import type { ManagedRuntime, ManagedRuntimePin } from '../../node-runtime/managed-runtime-release'
import { followLatestRelease } from '../../node-runtime/managed-runtime-latest-release'
import { requireRuntimeAnswersVersion } from '../../node-runtime/managed-runtime-version-check'
import { parseCodexCliVersion } from '../../../shared/agent-launch/startup/codex-cli-installation'

export function codexManagedTarget(
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch
): string | null {
  const cpu = arch === 'arm64' ? 'aarch64' : arch === 'x64' ? 'x86_64' : null
  const os =
    platform === 'darwin'
      ? 'apple-darwin'
      : platform === 'linux'
        ? 'unknown-linux-musl'
        : platform === 'win32'
          ? 'pc-windows-msvc'
          : null
  return cpu && os ? `${cpu}-${os}` : null
}

async function fetchLatestPin(_signal?: AbortSignal): Promise<ManagedRuntimePin | null> {
  throw new Error('This service is not included in the internal edition.')
}

/** The executable inside a Codex release folder; Codex finds its helpers beside it. */
export function codexManagedExecutable(folder: string): string {
  return join(folder, 'bin', process.platform === 'win32' ? 'codex.exe' : 'codex')
}

export const CODEX_MANAGED_RUNTIME: ManagedRuntime = {
  label: 'Codex',
  root: (dataDirectory) => join(dataDirectory, 'agent-runtimes', 'codex'),
  ...followLatestRelease(fetchLatestPin),
  validate: (folder, pin, signal) =>
    requireRuntimeAnswersVersion(
      codexManagedExecutable(folder),
      'Codex',
      pin.version,
      (answered) => parseCodexCliVersion(answered) === pin.version,
      signal
    )
}
