import type { SettingsSearchEntry } from '../search/settings-search'
import { translateSearchKeyword } from '../search/settings-search-keywords'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'

export const getBrowserMemorySaverSearchEntry = createLocalizedCatalog(
  (t): SettingsSearchEntry => ({
    title: t('settings.browser.memorySaver.title', 'Memory Saver'),
    description: t(
      'settings.browser.memorySaver.description',
      "Frees memory from tabs you haven't viewed. They reload when you open them."
    ),
    keywords: [
      ...translateSearchKeyword('auto.components.settings.browser.search.2d2d995c58', 'browser'),
      ...translateSearchKeyword('settings.browser.memorySaver.searchKeywords.memory', 'memory'),
      ...translateSearchKeyword('settings.browser.memorySaver.searchKeywords.tabs', 'tabs'),
      ...translateSearchKeyword('settings.browser.memorySaver.searchKeywords.idle', 'idle'),
      ...translateSearchKeyword('settings.browser.memorySaver.searchKeywords.sleep', 'sleep'),
      ...translateSearchKeyword(
        'settings.browser.memorySaver.searchKeywords.performance',
        'performance'
      )
    ]
  })
)
