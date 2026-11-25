import { useState } from 'react'
import { Network } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import type { MonitorData, MonitorHostSnapshot, MonitorSelection } from './monitor-host-snapshot'
import type { MonitorRelation } from './monitor-relations'
import type { MonitorWorkSelection } from './use-monitor-works'
import { MonitorOperations } from './MonitorOperations'
import { MonitorDetails } from './MonitorDetails'
import { MonitorRelationshipGraph } from './MonitorRelationshipGraph'
import { MonitorConversations } from './MonitorConversations'
import { MonitorWorks } from './MonitorWorks'

export function MonitorWorkspace({
  all,
  data,
  hosts,
  relations,
  selection,
  onSelect,
  conversationMessageIds,
  query,
  loaded,
  refreshing,
  onRefresh,
  onConfigure
}: {
  all: MonitorData
  data: MonitorData
  hosts: readonly MonitorHostSnapshot[]
  relations: MonitorRelation[]
  selection: MonitorSelection
  onSelect: (value: MonitorSelection) => void
  conversationMessageIds: Set<string>
  query: string
  loaded: boolean
  refreshing: boolean
  onRefresh: () => void
  onConfigure: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const [view, setView] = useState('operations')
  const [workSelection, setWorkSelection] = useState<MonitorWorkSelection>(null)
  const openWork = (hostId: string, runId: string) => {
    setWorkSelection({ hostId, runId })
    setView('works')
  }
  const details = (
    <MonitorDetails
      data={all}
      relations={relations}
      selection={selection}
      onSelect={onSelect}
      onOpenWork={openWork}
    />
  )
  return (
    <Tabs value={view} onValueChange={setView} className="min-w-0">
      <div className="scrollbar-sleek max-w-full overflow-x-auto">
        <TabsList>
          <TabsTrigger value="operations">
            {t('orchestrationMonitor.operations.title', 'Status & recovery')}
          </TabsTrigger>
          <TabsTrigger value="works">
            {t('orchestrationMonitor.work.title', 'Work tracking')}
          </TabsTrigger>
          <TabsTrigger value="conversations">
            {t('orchestrationMonitor.conversations', 'Conversations')}
          </TabsTrigger>
          <TabsTrigger value="map">{t('orchestrationMonitor.map', 'Relationship map')}</TabsTrigger>
        </TabsList>
      </div>
      {!data.participants.length && view !== 'works' ? (
        <div className="mt-3 rounded-xl border p-8 text-center">
          <Network className="mx-auto mb-4 size-6 text-muted-foreground" />
          <p className="text-sm">
            {query.trim()
              ? t('orchestrationMonitor.noSearch', 'No matching participants or messages.')
              : !loaded
                ? refreshing
                  ? t('orchestrationMonitor.loading', 'Reading orchestration data…')
                  : t(
                      'orchestrationMonitor.noData',
                      'Could not read orchestration data. Refresh to retry.'
                    )
                : t(
                    'orchestrationMonitor.empty',
                    'No participants recorded yet. Create a bot or connect an external CLI through the Orca MCP bridge.'
                  )}
          </p>
        </div>
      ) : (
        <div
          className={cn(
            'grid min-w-0 items-start gap-4',
            ((selection && view !== 'operations' && view !== 'works') || view === 'map') &&
              '@min-[1000px]/monitor:grid-cols-[minmax(0,1fr)_320px]'
          )}
        >
          <div className="min-w-0">
            <TabsContent value="operations">
              <MonitorOperations
                data={data}
                details={selection ? details : undefined}
                requestsLimited={hosts.some((host) => host.snapshot?.requestsLimited)}
                onSelect={onSelect}
                onRefresh={onRefresh}
                onConfigure={onConfigure}
              />
            </TabsContent>
            <TabsContent value="works">
              <MonitorWorks
                hosts={hosts}
                query={query}
                selection={workSelection}
                onSelect={setWorkSelection}
                messages={all.messages}
                onOpenMessage={(id) => {
                  onSelect({ kind: 'message', id })
                  setView('conversations')
                }}
              />
            </TabsContent>
            <TabsContent value="conversations">
              <MonitorConversations
                data={all}
                messageIds={conversationMessageIds}
                onSelect={onSelect}
              />
            </TabsContent>
            <TabsContent value="map">
              <MonitorRelationshipGraph
                data={data}
                relations={relations}
                selection={selection}
                onSelect={onSelect}
              />
            </TabsContent>
          </div>
          {(selection || view === 'map') && view !== 'operations' && view !== 'works'
            ? details
            : null}
        </div>
      )}
    </Tabs>
  )
}
