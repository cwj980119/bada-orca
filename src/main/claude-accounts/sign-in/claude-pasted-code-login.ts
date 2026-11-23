import { stripAnsiEscapeSequences } from '../../../shared/terminal/protocol/escape/ansi-escape-sequences'
import type { HostAccountSignInChannel } from '../../../shared/agent-accounts/host-account-sign-in-types'
import type { ClaudeCommandConfig, ClaudeCommandOptions } from './claude-command-process'
import { isClaudeLocalSignInLink } from './claude-sign-in-browser'
const CLAUDE_AUTHORIZE_HOSTS = new Set(['claude.com', 'claude.ai'])
export const CLAUDE_PASTED_CODE_REJECTED_MESSAGE =
  'Claude did not accept that code. Start the sign-in again.'

type RunCommand = (
  args: string[],
  config: ClaudeCommandConfig,
  timeoutMs: number,
  options?: ClaudeCommandOptions
) => Promise<string>

export function parseClaudePastedCodeSignInLink(output: string): string | null {
  const plain = stripAnsiEscapeSequences(output)
  // Require trailing whitespace to avoid publishing a link truncated between chunks.
  for (const match of plain.matchAll(/(https:\/\/\S+)\s/g)) {
    try {
      const url = new URL(match[1])
      if (
        CLAUDE_AUTHORIZE_HOSTS.has(url.hostname) &&
        url.searchParams.get('code') === 'true' &&
        url.searchParams.has('redirect_uri') &&
        !isClaudeLocalSignInLink(url.toString())
      ) {
        return url.toString()
      }
    } catch {
      // Not a link; keep scanning.
    }
  }
  return null
}

/** Relay the sign-in link and pasted code between a remote user and local Claude. */
export async function runClaudePastedCodeLogin(
  _folder: ClaudeCommandConfig,
  _runCommand: RunCommand,
  _channel: HostAccountSignInChannel,
  _setCancel: (cancel: (() => boolean) | null) => void
): Promise<void> {
  throw new Error('This service is not included in the internal edition.')
}
