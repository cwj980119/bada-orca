import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'
import { useAppStore } from '@/store'
import type { UseDetectedAgentsResult } from '@/lib/agent-session/launch/inventory/useDetectedAgents'
import type { BotAgent } from '../../../../shared/bot-types'
import { botAgentLabel } from './bot-presentation'

export function BotCliDiscoveryNotice({
  inventory,
  choices,
  onNavigate
}: {
  inventory: UseDetectedAgentsResult
  choices: readonly BotAgent[]
  onNavigate?: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const openSettingsTarget = useAppStore((state) => state.openSettingsTarget)
  const openSettingsPage = useAppStore((state) => state.openSettingsPage)
  const detected = inventory.detectedIds ?? []
  const configure = (pane: 'intranet' | 'agents'): void => {
    onNavigate?.()
    openSettingsTarget({ pane, repoId: null })
    openSettingsPage()
  }
  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <p role="status" className="text-xs text-muted-foreground">
        {inventory.isLoading
          ? t('intranet.bots.scanning', 'Detecting installed CLI tools…')
          : inventory.detectionFailed
            ? t(
                'intranet.bots.scanFailed',
                'Could not check the CLI tools on this computer. Check the connection and scan again.'
              )
            : choices.length
              ? t('intranet.bots.detected', 'Detected: {{agents}}', {
                  agents: choices.map((agent) => botAgentLabel(agent)).join(', ')
                })
              : t(
                  'intranet.bots.noCli',
                  'No supported CLI was detected on this computer. Check its installation path in Agents settings, then scan again.'
                )}
      </p>
      {choices.length ? (
        <p className="text-xs text-muted-foreground">
          {t(
            'intranet.bots.modelDefault',
            'Claude Code and OpenCode use existing CLI settings when no company model is registered. You can start chatting without selecting a model.'
          )}
        </p>
      ) : null}
      {!choices.length && detected.length ? (
        <p className="text-xs text-muted-foreground">
          {t(
            'intranet.bots.detectedUnsupported',
            'Installed tools without a supported Bot runtime: {{agents}}',
            { agents: detected.map((agent) => botAgentLabel(agent)).join(', ') }
          )}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={inventory.isLoading || inventory.isRefreshing}
          onClick={() => {
            void inventory.refresh().catch(() => undefined)
          }}
        >
          {inventory.isRefreshing
            ? t('intranet.bots.scanning', 'Detecting installed CLI tools…')
            : t('intranet.bots.rescan', 'Scan again')}
        </Button>
        <Button
          type="button"
          variant="link"
          size="inlineText"
          onClick={() => configure('intranet')}
        >
          {t('intranet.bots.openConnections', 'Configure company models and MCP')}
        </Button>
        {!choices.length ? (
          <Button
            type="button"
            variant="link"
            size="inlineText"
            onClick={() => configure('agents')}
          >
            {t('intranet.bots.cliPaths', 'CLI installation paths')}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
