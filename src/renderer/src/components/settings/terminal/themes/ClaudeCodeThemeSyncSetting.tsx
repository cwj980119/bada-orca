import type { GlobalSettings } from '../../../../../../shared/settings/global-settings-types'
import { SettingsSwitchRow } from '../../form-controls/SettingsFormControls'
import { SearchableSetting } from '../../section-layout/SearchableSetting'
import { getClaudeCodeThemeSyncSearchEntry } from './terminal-theme-search'
import { useTranslate } from '../../../../i18n/use-translate'

export function ClaudeCodeThemeSyncSetting({
  settings,
  updateSettings
}: {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
}): React.JSX.Element {
  const t = useTranslate()
  const [entry] = getClaudeCodeThemeSyncSearchEntry(t)
  return (
    <SearchableSetting {...entry}>
      <SettingsSwitchRow
        label={entry.title}
        description={entry.description}
        checked={settings.claudeCodeThemeSync}
        onChange={() => updateSettings({ claudeCodeThemeSync: !settings.claudeCodeThemeSync })}
      />
    </SearchableSetting>
  )
}
