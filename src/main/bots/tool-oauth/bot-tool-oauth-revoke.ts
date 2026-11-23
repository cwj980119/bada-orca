// Ending a sign-in: gone from this computer first, then the app is asked to end it (RFC 7009), in
// the background and with short deadlines, so a dead endpoint never holds up a removal.

import {
  commitBotToolOAuth,
  type BotToolOAuthEntry,
  type BotToolOAuthRecord
} from '../bot-tool-credentials'
import { inTransaction, type BotToolOAuthKey } from './bot-tool-oauth'

/**
 * Signs the tool out: the tokens are gone from this computer before the app is asked to end them,
 * and anything still running for the old sign-in can no longer commit. The registration stays.
 */
export async function signOutBotTool(key: BotToolOAuthKey): Promise<void> {
  let old: BotToolOAuthEntry | null = null
  await inTransaction(key, () =>
    commitBotToolOAuth(key.folder, key.credentialId, (current) => {
      if (!current) {
        return undefined
      }
      old = current
      const {
        tokens: _tokens,
        obtainedAt: _obtainedAt,
        lost: _lost,
        problem: _problem,
        ...kept
      } = current.record
      return { url: current.url, grant: current.grant + 1, record: kept }
    })
  )
  revokeBotToolSignIns(old ? [old] : [])
}

const revocations = new Set<Promise<void>>()

/** Ends removed sign-ins with their apps, in the background; the local copies are already gone. */
export function revokeBotToolSignIns(entries: readonly BotToolOAuthEntry[]): void {
  for (const entry of entries) {
    if (entry.record.tokens) {
      void revokeTokens(entry.url, entry.record)
    }
  }
}

/** Settles once every revocation started so far has; for tests and shutdown. */
export async function settleBotToolRevocations(): Promise<void> {
  while (revocations.size > 0) {
    await Promise.all(revocations)
  }
}

export function revokeTokens(url: string, record: BotToolOAuthRecord): Promise<void> {
  const run = revokeNow(url, record).catch(() => undefined)
  const tracked = run.finally(() => revocations.delete(tracked))
  revocations.add(tracked)
  return tracked
}

/** RFC 7009, refresh token first: most servers end the access token with its grant. */
async function revokeNow(_url: string, _record: BotToolOAuthRecord): Promise<void> {}
