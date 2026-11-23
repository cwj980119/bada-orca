import { createLocalizedCatalog } from '@/i18n/localized-catalog'
import type { SettingsSearchEntry } from '../search/settings-search'

export const getChatInlineVisualsSearchEntry = createLocalizedCatalog((t): SettingsSearchEntry => ({
  targetSectionId: 'chat-inline-visuals',
  title: t('components.settings.nativeChat.inlineVisualsTitle', 'Inline visuals'),
  description: t(
    'components.settings.nativeChat.inlineVisualsCopy',
    'Let the agent show charts, diagrams and mockups inside its replies. Applies to newly started chats.'
  )
}))
