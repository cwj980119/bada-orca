import { getDefaultSettings } from '../../../../shared/orca-profiles/constants'
import { defineFixture } from '../../component-fixtures/component-fixture'
import { LanguagePickerDialog } from './LanguagePickerDialog'

export const korean = defineFixture({
  width: 560,
  store: {
    settings: { ...getDefaultSettings('/home/fixture'), uiLanguage: 'ko' }
  },
  setup: () => {
    window.api.plugins.listMarketplacePlugins = async () => []
  },
  render: () => <LanguagePickerDialog open onOpenChange={() => {}} />
})
