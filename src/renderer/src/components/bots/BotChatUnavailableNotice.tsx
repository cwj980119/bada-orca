import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'
import { useAppStore } from '@/store'
import { botErrorMessage } from './bot-presentation'
import { isIntranetBotModelError } from '../../../../shared/intranet/intranet-bot-errors'

export function BotChatUnavailableNotice({
  error,
  pending,
  onRetry
}: {
  error: unknown
  pending: boolean
  onRetry: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const openSettingsTarget = useAppStore((state) => state.openSettingsTarget)
  const openSettingsPage = useAppStore((state) => state.openSettingsPage)
  return (
    <div role="alert" className="shrink-0 space-y-2 border-t border-border bg-background p-4">
      <p className="text-sm font-medium">
        {t('intranet.bots.chatUnavailable', 'The bot chat could not open')}
      </p>
      <p className="text-xs text-muted-foreground">{botErrorMessage(error, t)}</p>
      <div className="flex flex-wrap gap-2">
        {isIntranetBotModelError(error) ? (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              openSettingsTarget({ pane: 'intranet', repoId: null })
              openSettingsPage()
            }}
          >
            {t('intranet.bots.openConnections', 'Configure company models and MCP')}
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={onRetry}>
          {pending
            ? t('intranet.bots.openingChat', 'Opening chat…')
            : t('intranet.bots.retryChat', 'Open chat again')}
        </Button>
      </div>
    </div>
  )
}
