import { Download } from 'lucide-react'

import type { PluginLanguagePackRegistration } from '../../../../../shared/plugins/artifacts/plugin-language-pack-artifact'
import {
  availableCatalogPacks,
  languageNames,
  packPublisher,
  sharedLanguageNames,
  type CatalogLanguagePack
} from '@/components/languages/language-pack-options'
import type { Translate } from '@/i18n/use-translate'
import type {
  SettingsSearchableSelectGroup,
  SettingsSearchableSelectOption
} from '../form-controls/SettingsSearchableSelect'

/** Prefix for a catalog pack's dropdown value: choosing it installs, not switches. */
export const INSTALL_LANGUAGE_VALUE_PREFIX = 'install-language:'

type CommunityEntry = {
  id: string
  locale: string
  publisher: string
  installable: CatalogLanguagePack | null
}

/** Built-ins, then installed and installable community packs; no loading row, so the menu never grows. */
export function languageDropdownGroups(
  {
    builtIns,
    installed,
    catalog,
    t
  }: {
    builtIns: readonly SettingsSearchableSelectOption[]
    installed: readonly PluginLanguagePackRegistration[]
    /** Catalog packs once loaded; empty while loading, after a failure, or when installs are off. */
    catalog: readonly CatalogLanguagePack[]
    t: Translate
  },
  intlLocale?: string
): SettingsSearchableSelectGroup[] {
  const available = availableCatalogPacks(installed, catalog)
  const entries: CommunityEntry[] = [
    ...installed.map((pack) => ({
      id: pack.id,
      locale: pack.locale,
      publisher: packPublisher(pack),
      installable: null
    })),
    ...available.map((pack) => ({
      id: pack.id,
      locale: pack.locale,
      publisher: packPublisher(pack),
      installable: pack
    }))
  ].sort((a, b) =>
    languageNames(a.locale, intlLocale).native.localeCompare(
      languageNames(b.locale, intlLocale).native
    )
  )
  const sharedNames = sharedLanguageNames(entries, intlLocale)
  const community: SettingsSearchableSelectOption[] = entries.map((entry) => {
    const names = languageNames(entry.locale, intlLocale)
    // Why only for duplicates: one publisher per language needs no attribution in a menu.
    const byPublisher = sharedNames.has(names.native)
      ? t('languages.byPublisher', 'by {{publisher}}', { publisher: entry.publisher })
      : null
    return {
      value: entry.installable ? `${INSTALL_LANGUAGE_VALUE_PREFIX}${entry.id}` : entry.id,
      label: names.native,
      lang: entry.locale,
      keywords: [names.english, entry.locale, entry.publisher],
      detail:
        byPublisher || entry.installable ? (
          <span className="flex items-center gap-2">
            {byPublisher}
            {entry.installable ? (
              <span className="flex items-center gap-1">
                <Download className="size-3" />
                {t('languages.get', 'Get')}
              </span>
            ) : null}
          </span>
        ) : undefined
    }
  })
  return [
    { key: 'built-in', options: builtIns },
    ...(community.length > 0
      ? [
          {
            key: 'community',
            heading: t('languages.community', 'Community translations'),
            separated: true,
            options: community
          }
        ]
      : [])
  ]
}
