import { ArrowLeft, Loader2, Network, RefreshCw, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'

export function MonitorHeader({
  refreshing,
  onBack,
  onConfigure,
  onRefresh
}: {
  refreshing: boolean
  onBack: () => void
  onConfigure: () => void
  onRefresh: () => void
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label={t('orchestrationMonitor.back', 'Back')}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <Network className="size-5 shrink-0 text-muted-foreground" />
        <div>
          <h1 className="text-lg font-semibold">
            {t('orchestrationMonitor.title', 'Orchestration')}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t(
              'orchestrationMonitor.subtitle',
              'Participants, delegation, and messages across your hosts'
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onConfigure}>
          <Settings2 className="size-4" />
          {t('orchestrationMonitor.connectionsSettings', 'Connection settings')}
        </Button>
        <Button variant="outline" size="sm" disabled={refreshing} onClick={onRefresh}>
          {refreshing ? (
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {t('orchestrationMonitor.refresh', 'Refresh')}
        </Button>
      </div>
    </header>
  )
}
