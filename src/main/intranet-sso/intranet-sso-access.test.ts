import { expect, it, vi } from 'vitest'
import { INTRANET_SSO_METHODS } from '../runtime/rpc/methods/intranet-sso'
import { assertIntranetSsoSettingsAccess } from './intranet-sso-settings-access'
import { defaultIntranetSettings } from '../../shared/intranet/intranet-settings'
import { defaultIntranetSsoSettings } from '../../shared/intranet/intranet-sso'
import type { RpcContext } from '../runtime/rpc/core'
import { OrcaRuntimeService } from '../runtime/orca-runtime'

it.each([
  { kind: 'local-cli' as const },
  { kind: 'paired-device' as const, deviceId: 'remote-owner' }
])('keeps sign-in and account data out of non-desktop callers: %j', (caller) => {
  const runtime = new OrcaRuntimeService()
  for (const method of INTRANET_SSO_METHODS) {
    expect(() => method.handler({}, { runtime, caller })).toThrow(
      'Company sign-in is controlled from this desktop app.'
    )
  }
})

it('allows agent model changes without allowing the agent to replace the identity provider', () => {
  const runtime = new OrcaRuntimeService()
  vi.spyOn(runtime, 'getClientSettings').mockReturnValue({
    intranet: defaultIntranetSettings()
  } as ReturnType<typeof runtime.getClientSettings>)
  const context: RpcContext = { runtime, caller: { kind: 'local-cli' } }
  expect(() => assertIntranetSsoSettingsAccess(context, defaultIntranetSettings())).not.toThrow()
  expect(() =>
    assertIntranetSsoSettingsAccess(context, {
      ...defaultIntranetSettings(),
      sso: { ...defaultIntranetSsoSettings(), issuer: 'https://another.company.internal' }
    })
  ).toThrow('SSO settings are changed from this desktop app.')
})
