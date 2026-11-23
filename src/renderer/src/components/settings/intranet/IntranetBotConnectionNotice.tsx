import { Button } from '../../ui/button'
import { useAppStore } from '@/store'
import { useTranslate } from '@/i18n/use-translate'

export function IntranetBotConnectionNotice(): React.JSX.Element {
  const t = useTranslate()
  const openSettingsTarget = useAppStore((state) => state.openSettingsTarget)
  const openSettingsPage = useAppStore((state) => state.openSettingsPage)
  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <p className="text-settings-detail text-muted-foreground">
        {t(
          'intranet.bots.connectionHelp',
          'Claude Code and OpenCode can use their existing CLI settings and authentication without registering a model here. Registered company models override CLI defaults. Company MCP servers and skill/document folders apply to new sessions.'
        )}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          openSettingsTarget({ pane: 'intranet', repoId: null })
          openSettingsPage()
        }}
      >
        {t('intranet.bots.openConnections', 'Configure company models and MCP')}
      </Button>
    </div>
  )
}
