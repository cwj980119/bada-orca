import { createLocalizedCatalog } from '@/i18n/localized-catalog'
import type { SettingsSearchEntry } from '../search/settings-search'
import { translateSearchKeyword } from '../search/settings-search-keywords'

/** Settings-search entry for the status bar usage format template. */
export const getStatusBarUsageFormatEntry = createLocalizedCatalog((t): SettingsSearchEntry => ({
  title: t('auto.components.settings.appearance.search.statusBarUsageFormat.title', 'Usage format'),
  description: t(
    'auto.components.settings.appearance.search.statusBarUsageFormat.description',
    'Customize how each provider’s usage is written in the status bar with placeholders.'
  ),
  keywords: [
    ...translateSearchKeyword('auto.components.settings.appearance.search.00a028f25f', 'usage'),
    ...translateSearchKeyword(
      'auto.components.settings.appearance.search.896eb53fd4',
      'status bar'
    ),
    ...translateSearchKeyword(
      'auto.components.settings.appearance.search.statusBarUsageFormat.format',
      'format'
    ),
    ...translateSearchKeyword(
      'auto.components.settings.appearance.search.statusBarUsageFormat.template',
      'template'
    ),
    ...translateSearchKeyword(
      'auto.components.settings.appearance.search.statusBarUsageFormat.placeholder',
      'placeholder'
    )
  ]
}))
