import { expect, it } from 'vitest'
import { createGlobalSettingsFixture } from '../settings/global-settings-test-fixture'
import { defaultIntranetSettings } from './intranet-settings'
import { enforceIntranetSettings } from './enforce-intranet-settings'

it('removes legacy Claude company overrides while retaining unrelated and explicit model choices', () => {
  const settings = createGlobalSettingsFixture({
    intranet: {
      ...defaultIntranetSettings(),
      claude: { baseUrl: 'https://old.internal', model: 'old-model' }
    },
    agentLaunchChoices: {
      claude: { model: 'old-model', options: { effort: 'high' } },
      codex: { model: 'codex-model' }
    },
    nativeChatSessionOptions: { claude: { model: 'explicit-model' } }
  })
  enforceIntranetSettings(settings)
  expect(settings.intranet?.claude).toEqual({ baseUrl: '', model: '' })
  expect(settings.agentLaunchChoices?.claude).toEqual({ options: { effort: 'high' } })
  expect(settings.agentLaunchChoices?.codex).toEqual({ model: 'codex-model' })
  expect(settings.nativeChatSessionOptions?.claude).toEqual({ model: 'explicit-model' })
})
