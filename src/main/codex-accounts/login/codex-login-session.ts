import type { WindowsHostInteractiveLoginSpawn } from '../../providers/shell-launch/windows/windows-interactive-login-spawn'

type LoginOutputStream = {
  on(event: 'data', listener: (chunk: Buffer) => void): unknown
  off(event: 'data', listener: (chunk: Buffer) => void): unknown
}

export type CodexLoginChild = {
  stdout: LoginOutputStream | null
  stderr: LoginOutputStream | null
  pid?: number
  exitCode: number | null
  signalCode: string | null
  kill(): boolean
  on(event: 'error', listener: (error: Error) => void): unknown
  on(event: 'close', listener: (code: number | null) => void): unknown
  off(event: 'error', listener: (error: Error) => void): unknown
  off(event: 'close', listener: (code: number | null) => void): unknown
}

export type CodexLoginSpawnRequest = {
  command: string
  args: string[]
  env: NodeJS.ProcessEnv
  stdio: WindowsHostInteractiveLoginSpawn['stdio'] | ['ignore', 'pipe', 'pipe']
}

type CodexLoginSessionDependencies = {
  wslCommand: string
  spawn: (request: CodexLoginSpawnRequest) => CodexLoginChild
  killProcessTree: (
    child: CodexLoginChild,
    interactiveLogin?: WindowsHostInteractiveLoginSpawn | null
  ) => void
  /** Registers the handle that abandons this login; the caller clears it. */
  setCancel: (cancel: () => boolean) => void
  /** The browser link codex printed, published as soon as it is complete. */
  onAuthUrl: (url: string) => void
  /** Opens a WSL login's link on this computer; absent where Orca cannot open one. */
  openWslAuthUrl?: ((url: string) => void) | null
  /** Runs `codex login --device-auth` on a Linux/macOS host for a person on another device. */
  deviceAuth?: { onPrompt: (prompt: { url: string; userCode: string }) => void }
}

export async function runCodexLoginSession(
  _managedHomePath: string,
  _dependencies: CodexLoginSessionDependencies
): Promise<void> {
  throw new Error('This service is not included in the internal edition.')
}
