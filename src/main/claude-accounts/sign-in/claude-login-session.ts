import type { ClaudeCommandConfig, ClaudeCommandOptions } from './claude-command-process'

type ClaudeLoginSessionDependencies = {
  runCommand: (
    args: string[],
    config: ClaudeCommandConfig,
    timeoutMs: number,
    options?: ClaudeCommandOptions
  ) => Promise<string>
  setCancel: (cancel: (() => boolean) | null) => void
  openWslSignInLink?: ((signInLink: string) => void) | null
}

/** With `onLink`, suppress browser opening and fail if no link arrives. */
export async function runClaudeLoginSession(
  _folder: ClaudeCommandConfig,
  _dependencies: ClaudeLoginSessionDependencies,
  _onLink?: (signInLink: string) => void
): Promise<void> {
  throw new Error('This service is not included in the internal edition.')
}
