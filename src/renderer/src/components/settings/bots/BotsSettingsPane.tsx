import type { GlobalSettings } from '../../../../../shared/settings/global-settings-types'
import { useState } from 'react'
import { Plus, Settings } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { SettingsSwitchRow } from '../form-controls/SettingsFormControls'
import { IntranetBotConnectionNotice } from '../intranet/IntranetBotConnectionNotice'
import { useBots, openBotHomeTab } from '@/lib/bot-catalog'
import { useAppStore } from '@/store'
import { Button } from '../../ui/button'
import { NewBotDialog } from '../../bots/NewBotDialog'
import { SettingsGroup } from '../section-layout/SettingsGroup'

/** Local bot controls and the company model connection entry. */
export function BotsSettingsPane({
  settings,
  updateSettings
}: {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
}): React.JSX.Element {
  const t = useTranslate()
  const bots = useBots()
  const [creating, setCreating] = useState(false)
  const openSettingsTarget = useAppStore((state) => state.openSettingsTarget)
  const enabled = settings.botsEnabled !== false
  const enableRow = (
    <SettingsSwitchRow
      label={t('settings.bots.enable', 'Enable bots')}
      description={t(
        'settings.bots.enableDescription',
        'Shows bots on this computer, including bots on your servers, and lets this computer’s bots take messages and run automations. Turning this off hides them; their folders, memory and chats stay where they are.'
      )}
      checked={enabled}
      onChange={() => updateSettings({ botsEnabled: !enabled })}
    />
  )
  if (!enabled) {
    return enableRow
  }
  return (
    <div className="space-y-8">
      <IntranetBotConnectionNotice />
      <div>
        {enableRow}
        <SettingsSwitchRow
          label={t('settings.bots.askNewHomeChat', 'Ask before a new Home Chat')}
          description={t(
            'settings.bots.askNewHomeChatDescription',
            'Confirm before New Home Chat replaces the conversation a bot carries.'
          )}
          checked={!settings.skipNewHomeChatConfirm}
          onChange={() =>
            updateSettings({ skipNewHomeChatConfirm: !settings.skipNewHomeChatConfirm })
          }
        />
      </div>
      <SettingsGroup
        title={t('intranet.bots.list', 'Company bots')}
        action={
          <Button type="button" variant="outline" size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            {t('intranet.bots.create', 'Create bot')}
          </Button>
        }
      >
        {bots.length ? (
          bots.map((bot) => (
            <div
              key={`${bot.hostId}:${bot.id}`}
              data-settings-row=""
              className="flex min-h-11 items-center gap-3 py-2"
            >
              <Button
                type="button"
                variant="ghost"
                className="min-w-0 flex-1 justify-start truncate"
                onClick={() => {
                  void openBotHomeTab(bot)
                }}
              >
                {bot.name}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t('intranet.bots.settings', 'Bot settings')}
                onClick={() =>
                  openSettingsTarget({ pane: 'bots', sectionId: bot.id, repoId: null })
                }
              >
                <Settings className="size-4" />
              </Button>
            </div>
          ))
        ) : (
          <p data-settings-row="" className="py-3 text-settings-detail text-muted-foreground">
            {t(
              'intranet.bots.empty',
              'Create a bot and choose its company model, role and working projects.'
            )}
          </p>
        )}
      </SettingsGroup>
      {creating ? <NewBotDialog open onOpenChange={(open) => setCreating(open)} /> : null}
    </div>
  )
}
