import type { IntranetSettings } from '../../shared/intranet/intranet-settings'
import { defaultIntranetSsoSettings } from '../../shared/intranet/intranet-sso'
import { InvalidArgumentError, type RpcContext } from '../runtime/rpc/core'

export function assertIntranetSsoSettingsAccess(
  context: RpcContext,
  intranet: IntranetSettings | undefined
): void {
  if (!intranet || context.caller?.kind === 'desktop') {
    return
  }
  const current = context.runtime.getClientSettings().intranet?.sso ?? defaultIntranetSsoSettings()
  const next = intranet.sso ?? defaultIntranetSsoSettings()
  if (JSON.stringify(current) !== JSON.stringify(next)) {
    throw new InvalidArgumentError('Company SSO settings are changed from this desktop app.')
  }
}
