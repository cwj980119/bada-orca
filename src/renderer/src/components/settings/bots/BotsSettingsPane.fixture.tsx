import { defineFixture } from '../../../component-fixtures/component-fixture'
import { getDefaultSettings } from '../../../../../shared/orca-profiles/constants'
import { BotsSettingsPane } from './BotsSettingsPane'

const settings = { ...getDefaultSettings('/fixture'), botsEnabled: true }

export const local = defineFixture({
  width: 760,
  store: { settings },
  setup: () => {
    Reflect.set(window.api, 'runtime', {
      ...window.api.runtime,
      call: async () => ({ ok: true, result: { bots: [], groups: [], botsEnabled: true } })
    })
  },
  render: () => (
    <div className="settings-view-shell bg-background p-8">
      <BotsSettingsPane settings={settings} updateSettings={() => {}} />
    </div>
  )
})
