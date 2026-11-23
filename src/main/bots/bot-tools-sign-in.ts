import type { BotToolsCli } from './bot-tools-host'

export type BotToolSignInStatus = 'pending' | 'done' | 'failed' | 'none'

type SignIn = {
  callback: string | null
  status: Exclude<BotToolSignInStatus, 'none'>
}

const signIns = new Map<string, SignIn>()
const signInKey = (botId: string, name: string) => `${botId}\0${name}`

/** How the last sign-in this host started for the tool went; 'none' when it started none. */
export function botToolSignInStatus(botId: string, name: string): BotToolSignInStatus {
  return signIns.get(signInKey(botId, name))?.status ?? 'none'
}

/** Drops a removed tool's sign-in, or every one of a deleted bot's. */
export function forgetBotToolSignIns(botId: string, name?: string): void {
  for (const key of signIns.keys()) {
    if (name === undefined ? key.startsWith(`${botId}\0`) : key === signInKey(botId, name)) {
      signIns.delete(key)
    }
  }
}

/**
 * Starts a tool's browser sign-in and answers with the page to open once the CLI names it; the CLI
 * keeps waiting for the browser on this host. Null: the CLI opened the browser itself.
 */
export async function connectBotTool(
  _botId: string,
  _name: string,
  _resolveCli: () => Promise<BotToolsCli>
): Promise<{ authorizationUrl: string | null }> {
  throw new Error('This service is not included in the internal edition.')
}

/**
 * Finishes a sign-in whose browser ran on another computer: the address it ended on names this
 * host's callback, which only this host can reach.
 */
export async function finishBotToolSignIn(
  _cli: BotToolsCli,
  _name: string,
  _address: string
): Promise<void> {
  throw new Error('This service is not included in the internal edition.')
}
