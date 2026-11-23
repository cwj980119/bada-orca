import { translateSearchKeyword } from '../../search/settings-search-keywords'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'

// Light-mode rows render only after switching Theme mode to Light, so their results land on that switch.
export const TERMINAL_THEME_MODE_SETTING_ID = 'terminal-theme-mode'

export const getTerminalDarkThemeSearchEntries = createLocalizedCatalog((t) => [
  {
    title: t('auto.components.settings.terminal.search.ee9665265e', 'Dark theme'),
    description: t(
      'auto.components.settings.terminal.search.13f6310dd3',
      'Choose the terminal theme used in dark mode.'
    ),
    keywords: [
      ...translateSearchKeyword('auto.components.settings.terminal.search.f66a7cf715', 'terminal'),
      ...translateSearchKeyword('auto.components.settings.terminal.search.0ce176909a', 'theme'),
      ...translateSearchKeyword('auto.components.settings.terminal.search.f785374072', 'dark', {
        aliases: ['dark terminal theme']
      }),
      ...translateSearchKeyword('auto.components.settings.terminal.search.7718d70356', 'preview')
    ]
  },
  {
    title: t('auto.components.settings.terminal.search.88f3d1cec0', 'Dark divider color'),
    description: t(
      'auto.components.settings.terminal.search.9c32726f47',
      'Controls the split divider line between panes in dark mode.'
    ),
    keywords: [
      ...translateSearchKeyword('auto.components.settings.terminal.search.f66a7cf715', 'terminal'),
      ...translateSearchKeyword('auto.components.settings.terminal.search.781f49d942', 'divider'),
      ...translateSearchKeyword('auto.components.settings.terminal.search.f785374072', 'dark'),
      ...translateSearchKeyword('auto.components.settings.terminal.search.674b7c8436', 'color')
    ]
  }
])

export const getTerminalThemeTargetSearchEntries = createLocalizedCatalog((t) => [
  {
    title: t('auto.components.settings.terminal.search.theme_target.329882bdda', 'Theme mode'),
    keywords: [
      ...translateSearchKeyword('auto.components.settings.terminal.search.f66a7cf715', 'terminal'),
      ...translateSearchKeyword('auto.components.settings.terminal.search.0ce176909a', 'theme'),
      ...translateSearchKeyword(
        'auto.components.settings.terminal.search.theme_target.keyword_target',
        'target'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.terminal.search.theme_target.keyword_editing',
        'editing'
      )
    ]
  }
])

export const getTerminalLightThemeSearchEntries = createLocalizedCatalog((t) => [
  {
    targetSectionId: TERMINAL_THEME_MODE_SETTING_ID,
    title: t('auto.components.settings.terminal.search.match_dark_mode_title', 'Match dark mode'),
    description: t(
      'auto.components.settings.terminal.search.f268092ee3',
      'Light mode can use its own terminal theme.'
    ),
    keywords: [
      ...translateSearchKeyword('auto.components.settings.terminal.search.f66a7cf715', 'terminal'),
      ...translateSearchKeyword(
        'auto.components.settings.terminal.search.da864e6cec',
        'light mode'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.terminal.search.match_dark_mode_title',
        'Match dark mode',
        {
          aliases: [
            'Customize Light Mode',
            'Use separate light theme',
            'Use Separate Theme In Light Mode',
            'Match dark mode terminal theme'
          ]
        }
      ),
      ...translateSearchKeyword('auto.components.settings.terminal.search.0ce176909a', 'theme')
    ]
  },
  {
    title: t('auto.components.settings.terminal.search.e4d3288a81', 'Light theme'),
    description: t(
      'auto.components.settings.terminal.search.1dee533bd9',
      'Choose the theme used when Orca is in light mode.'
    ),
    keywords: [
      ...translateSearchKeyword('auto.components.settings.terminal.search.f66a7cf715', 'terminal'),
      ...translateSearchKeyword('auto.components.settings.terminal.search.0ce176909a', 'theme', {
        aliases: ['light terminal theme']
      }),
      ...translateSearchKeyword('auto.components.settings.terminal.search.411229c636', 'light'),
      ...translateSearchKeyword('auto.components.settings.terminal.search.7718d70356', 'preview')
    ]
  },
  {
    targetSectionId: TERMINAL_THEME_MODE_SETTING_ID,
    title: t('auto.components.settings.terminal.search.18a9f63aff', 'Light divider color'),
    description: t(
      'auto.components.settings.terminal.search.77d9f9cd55',
      'Controls the split divider line between panes in light mode.'
    ),
    keywords: [
      ...translateSearchKeyword('auto.components.settings.terminal.search.f66a7cf715', 'terminal'),
      ...translateSearchKeyword('auto.components.settings.terminal.search.781f49d942', 'divider'),
      ...translateSearchKeyword('auto.components.settings.terminal.search.411229c636', 'light'),
      ...translateSearchKeyword('auto.components.settings.terminal.search.674b7c8436', 'color')
    ]
  }
])

export const getTerminalYamlImportSearchEntries = createLocalizedCatalog((t) => [
  {
    title: t('auto.components.settings.terminal.search.yaml_import.title', 'Import from YAML'),
    description: t(
      'auto.components.settings.terminal.search.yaml_import.description',
      'Import theme YAML files as Orca terminal themes.'
    ),
    keywords: [
      t('auto.components.settings.terminal.search.yaml_import.keyword_yaml', 'yaml'),
      t('auto.components.settings.terminal.search.fd752b3cac', 'import'),
      t('auto.components.settings.terminal.search.f66a7cf715', 'terminal'),
      t('auto.components.settings.terminal.search.0ce176909a', 'theme'),
      t('auto.components.settings.terminal.search.warp_import.keyword_themes', 'themes'),
      t('auto.components.settings.terminal.search.yaml_import.keyword_custom', 'custom')
    ]
  }
])

export const getTerminalWarpImportSearchEntries = createLocalizedCatalog((t) => [
  {
    title: t('auto.components.settings.terminal.search.warp_import.title', 'Import from Warp'),
    description: t(
      'auto.components.settings.terminal.search.warp_import.description',
      'Import Warp themes as Orca terminal themes.'
    ),
    keywords: [
      t('auto.components.settings.terminal.search.warp_import.keyword_warp', 'warp'),
      t('auto.components.settings.terminal.search.fd752b3cac', 'import'),
      t('auto.components.settings.terminal.search.f66a7cf715', 'terminal'),
      t('auto.components.settings.terminal.search.0ce176909a', 'theme'),
      t('auto.components.settings.terminal.search.warp_import.keyword_themes', 'themes'),
      t('auto.components.settings.terminal.search.warp_import.keyword_yaml', 'yaml'),
      t(
        'auto.components.settings.terminal.search.warp_import.keyword_legacy_title',
        'Import themes from Warp'
      )
    ]
  }
])

export const getClaudeCodeThemeSyncSearchEntry = createLocalizedCatalog((t) => [
  {
    title: t(
      'components.settings.terminal.claudeCodeThemeSync.9353305ea6',
      'Match Claude Code to terminal theme'
    ),
    description: t(
      'components.settings.terminal.claudeCodeThemeSync.description',
      'Claude Code on this computer uses your terminal colors and follows theme changes live, including outside Orca. Turning this off restores your previous Claude Code theme. Picking a theme in Claude Code stops the sync.'
    ),
    keywords: [
      ...translateSearchKeyword('auto.components.settings.terminal.search.0ce176909a', 'theme'),
      ...translateSearchKeyword(
        'components.settings.terminal.claudeCodeThemeSync.claude',
        'claude'
      ),
      ...translateSearchKeyword('auto.components.settings.terminal.search.674b7c8436', 'color')
    ]
  }
])
