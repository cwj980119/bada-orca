import {
  IntranetSsoParams,
  IntranetSsoSignInParams
} from '../../../../shared/intranet/intranet-sso'
import { runtimeIntranetSso } from '../../../intranet-sso/runtime-intranet-sso'
import { defineMethod, InvalidArgumentError, type RpcContext } from '../core'
import { readIntranetSettings } from '../../../../shared/intranet/intranet-settings'

function service(context: RpcContext) {
  if (context.caller?.kind !== 'desktop') {
    throw new InvalidArgumentError('Company sign-in is controlled from this desktop app.')
  }
  return runtimeIntranetSso(context.runtime)
}

export const INTRANET_SSO_METHODS = [
  defineMethod({
    name: 'intranet.ssoCredentials',
    permission: 'workspace',
    params: IntranetSsoParams,
    handler: (_params, context) => {
      if (context.caller?.kind !== 'desktop' && context.caller?.kind !== 'local-cli') {
        throw new InvalidArgumentError(
          'BADA credentials are available only to local apps and agents.'
        )
      }
      const auth = runtimeIntranetSso(context.runtime)
      return auth.ensureFresh().then(() => {
        const credentials = auth.credentials()
        if (!credentials) {
          throw new InvalidArgumentError('Sign in to BADA again to obtain a valid token.')
        }
        return credentials
      })
    }
  }),
  defineMethod({
    name: 'intranet.ssoStatus',
    permission: 'workspace',
    params: IntranetSsoParams,
    handler: (_params, context) => service(context).ensureFresh()
  }),
  defineMethod({
    name: 'intranet.ssoSignIn',
    permission: 'workspace',
    params: IntranetSsoSignInParams,
    handler: (params, context) => {
      const auth = service(context)
      const save = params.configuration
        ? context.runtime.updateClientSettings({
            intranet: {
              ...readIntranetSettings(context.runtime.getClientSettings().intranet),
              sso: params.configuration
            }
          })
        : Promise.resolve()
      return save.then(() => auth.start(params.clientSecret))
    }
  }),
  defineMethod({
    name: 'intranet.ssoSignOut',
    permission: 'workspace',
    params: IntranetSsoParams,
    handler: (_params, context) => service(context).signOut()
  }),
  defineMethod({
    name: 'intranet.ssoCancel',
    permission: 'workspace',
    params: IntranetSsoParams,
    handler: (_params, context) => {
      const auth = service(context)
      auth.cancel()
      return auth.status()
    }
  })
]
