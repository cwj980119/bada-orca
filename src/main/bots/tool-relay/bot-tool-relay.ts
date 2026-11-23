import { randomBytes, createHash } from 'node:crypto'
import type {
  BotToolCredentialSource,
  BotToolHeaderSource
} from '../tool-oauth/bot-tool-credential-source'

import type { RelayFetch } from './bot-tool-relay-upstream'

export class BotToolRelay {
  private readonly grants = new Map<string, { botId: string; token: string }>()

  constructor(_fetchUpstream?: RelayFetch, _source?: BotToolCredentialSource) {}

  async grant(_botId: string, _folder: string): Promise<{ origin: string; token: string }> {
    let entry = this.grants.get(_botId)
    if (!entry) {
      entry = { botId: _botId, token: randomBytes(32).toString('base64url') }
      this.grants.set(_botId, entry)
    }
    return { origin: 'http://127.0.0.1', token: entry.token }
  }

  botOf(token: string): string | null {
    const hash = (value: string) => createHash('sha256').update(value).digest('hex')
    const wanted = hash(token)
    for (const entry of this.grants.values()) {
      if (hash(entry.token) === wanted) {
        return entry.botId
      }
    }
    return null
  }

  revoke(botId: string): void {
    this.grants.delete(botId)
  }

  lastProblem(_folder: string, _credentialId: string): string | null {
    return null
  }

  close(): void {
    this.grants.clear()
  }
}

export const composioHeaderSource =
  (_readKey: () => string | null): BotToolHeaderSource =>
  () =>
    null

export const botToolRelay = new BotToolRelay()
