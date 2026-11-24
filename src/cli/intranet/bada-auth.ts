import type { BadaCredentials } from '../../shared/intranet/intranet-sso'
import type { CommandHandler } from '../dispatch/dispatch'
import { rejectRemoteSelectionFlags } from '../dispatch/remote-selection-flag-rejection'
import { printResult } from '../output/command-result-output'

export const BADA_AUTH_HANDLERS: Record<string, CommandHandler> = {
  'auth bada': async (ctx) => {
    rejectRemoteSelectionFlags(ctx.flags, '`orca auth bada`. Read BADA from the local desktop app.')
    const response = await ctx.client.call<BadaCredentials>('intranet.ssoCredentials', {})
    const { accessToken, idToken, ...identity } = response.result
    const result =
      ctx.flags.get('token') === true
        ? { ...identity, accessToken, idToken, tokenType: 'Bearer' }
        : identity
    printResult({ ...response, result }, ctx.json, (value) => JSON.stringify(value, null, 2))
  }
}
