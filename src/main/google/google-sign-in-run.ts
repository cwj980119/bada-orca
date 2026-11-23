import type { GoogleSignInPrompt } from '../../shared/google/google-connect-types'
import type { GoogleServiceChoice } from '../../shared/google/google-scopes'
import type { GoogleClientConfig } from '../../shared/google/google-client-config'
import type { CallerOwnedSignInChannel } from '../runtime/caller-owned-sign-in-flows'

import type { GoogleAccountRecord } from './google-credential-store'
import type { GoogleHttp } from './google-token-endpoint'

export const GOOGLE_SIGN_IN_TTL_MS = 5 * 60_000

export const NO_GOOGLE_CLIENT =
  'Add your team’s Google client first, in Orca, from its Desktop app client file.'

export type GoogleSignInDeps = {
  http: GoogleHttp
  now: () => number
  client: () => GoogleClientConfig | null

  openBrowser?: (url: string) => Promise<void>
}

export type GoogleSignInOptions = {
  callerLoopbackPort?: number

  loginHint?: string

  choices: readonly GoogleServiceChoice[]

  openBrowser: boolean
}

export async function runGoogleSignIn(
  _deps: GoogleSignInDeps,
  _options: GoogleSignInOptions,
  _channel: CallerOwnedSignInChannel<GoogleSignInPrompt, string>
): Promise<GoogleAccountRecord> {
  throw new Error('This service is not included in the internal edition.')
}
