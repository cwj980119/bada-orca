import { expect, it, vi } from 'vitest'
import { createSsoFixture } from './intranet-sso.test-fixture'
import { OrcaRuntimeService } from '../runtime/orca-runtime'
import { registerRuntimeIntranetSso } from './runtime-intranet-sso'
import { INTRANET_SSO_METHODS } from '../runtime/rpc/methods/intranet-sso'
import { defaultIntranetSettings } from '../../shared/intranet/intranet-settings'

it('lets the desktop save manual login settings before starting an unconfigured sign-in', async () => {
  const fixture = await createSsoFixture()
  const configuration = fixture.service.status().configuration!
  fixture.setSettings({ enabled: false, clientId: '' })
  const runtime = new OrcaRuntimeService()
  const dispose = registerRuntimeIntranetSso(runtime, fixture.service)
  const read = vi.spyOn(runtime, 'getClientSettings').mockReturnValue({
    intranet: defaultIntranetSettings()
  } as ReturnType<typeof runtime.getClientSettings>)
  const write = vi.spyOn(runtime, 'updateClientSettings').mockImplementation(async (settings) => {
    fixture.setSettings(settings.intranet?.sso ?? {})
    return { intranet: settings.intranet } as ReturnType<typeof runtime.getClientSettings>
  })
  try {
    expect(fixture.service.status().state).toBe('unconfigured')
    const method = INTRANET_SSO_METHODS.find((entry) => entry.name === 'intranet.ssoSignIn')!
    await method.handler({ configuration }, { runtime, caller: { kind: 'desktop' } })
    await vi.waitFor(() => expect(fixture.service.status().state).toBe('signed-in'))
    expect(fixture.service.credentials()?.subject).toBe('employee-7')
  } finally {
    dispose()
    read.mockRestore()
    write.mockRestore()
    await fixture.close()
  }
})
