import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { isIntranetBotModelError } from '../../../../shared/intranet/intranet-bot-errors'
import { botErrorMessage } from './bot-presentation'
import type { BotRef } from '@/lib/bot-hosts'

export function showBotChatOpenError(bot: BotRef, error: unknown): void {
  toast.error(botErrorMessage(error), {
    id: `bot-chat-open:${bot.hostId}:${bot.id}`,
    ...(isIntranetBotModelError(error)
      ? {
          action: {
            label: translate('intranet.bots.openConnections', 'Configure company models and MCP'),
            onClick: () => {
              const { openSettingsTarget, openSettingsPage } = useAppStore.getState()
              openSettingsTarget({ pane: 'intranet', repoId: null })
              openSettingsPage()
            }
          }
        }
      : {})
  })
}
