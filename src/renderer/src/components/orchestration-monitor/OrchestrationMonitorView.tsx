import { useState } from 'react'
import { ArrowLeft, Loader2, Network, RefreshCw, Settings2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import {
  mergeMonitorHosts,
  type MonitorHostSnapshot,
  type MonitorSelection
} from './monitor-host-snapshot'
import { monitorRelations } from './monitor-relations'
import { monitorLabel } from './monitor-labels'
import { MonitorDetails, MonitorMessageBadges } from './MonitorDetails'
import { MonitorRelationshipGraph } from './MonitorRelationshipGraph'
import { cn } from '@/lib/class-names'

export function OrchestrationMonitorView({
  hosts,
  refreshing,
  onRefresh,
  onBack,
  onConfigure
}: {
  hosts: readonly MonitorHostSnapshot[]
  refreshing: boolean
  onRefresh: () => void
  onBack: () => void
  onConfigure: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const locale = useIntlLocale()
  const [hostId, setHostId] = useState('all')
  const [query, setQuery] = useState('')
  const [selection, setSelection] = useState<MonitorSelection>(null)
  const scopedHosts = hosts.filter((host) => hostId === 'all' || host.id === hostId)
  const all = mergeMonitorHosts(scopedHosts)
  const needle = query.trim().toLocaleLowerCase()
  const matchingParticipants = new Set(
    all.participants
      .filter((participant) =>
        [
          participant.name,
          participant.address,
          participant.agent,
          participant.host.label,
          participant.executionHost
        ].some((value) => value?.toLocaleLowerCase().includes(needle))
      )
      .map((participant) => participant.id)
  )
  const matchesParties = (from: string, to: string) =>
    matchingParticipants.has(from) || matchingParticipants.has(to)
  const messages = all.messages.filter(
    (message) =>
      !needle ||
      matchesParties(message.from, message.to) ||
      `${message.subject} ${message.preview}`.toLocaleLowerCase().includes(needle)
  )
  const assignments = all.assignments.filter(
    (assignment) =>
      !needle ||
      matchesParties(assignment.from, assignment.to) ||
      assignment.task.title.toLocaleLowerCase().includes(needle)
  )
  const visibleIds = new Set([
    ...matchingParticipants,
    ...messages.flatMap((message) => [message.from, message.to]),
    ...assignments.flatMap((assignment) => [assignment.from, assignment.to])
  ])
  const data = {
    participants: all.participants.filter((participant) => visibleIds.has(participant.id)),
    messages,
    assignments
  }
  const relations = monitorRelations(data)
  const selectedRelation =
    selection?.kind === 'relation'
      ? relations.find((relation) => relation.id === selection.id)
      : null
  const shownMessages =
    selection?.kind === 'participant'
      ? messages.filter((message) => [message.from, message.to].includes(selection.id))
      : selectedRelation
        ? selectedRelation.messages
        : messages
  const failedHosts = scopedHosts.filter(
    (host) => host.state !== 'ready' && host.state !== 'loading'
  )
  const loaded = scopedHosts.some((host) => host.snapshot)
  const limited = scopedHosts.some(
    (host) => host.snapshot && Object.values(host.snapshot.limits).some(Boolean)
  )
  const name = (id: string) =>
    all.participants.find((participant) => participant.id === id)?.name ?? id

  return (
    <div className="@container/monitor flex h-full min-h-0 min-w-0 flex-col bg-background text-foreground">
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
      <div className="scrollbar-sleek min-h-0 flex-1 overflow-auto p-4 lg:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="w-48">
            <Select
              value={hostId}
              onValueChange={(value) => {
                setHostId(value)
                setSelection(null)
              }}
            >
              <SelectTrigger aria-label={t('orchestrationMonitor.hostFilter', 'Filter by host')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t('orchestrationMonitor.allHosts', 'All hosts')}
                </SelectItem>
                {hosts.map((host) => (
                  <SelectItem key={host.id} value={host.id}>
                    {host.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            className="w-72 max-w-full"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={t('orchestrationMonitor.search', 'Search participants and messages')}
            placeholder={t('orchestrationMonitor.search', 'Search participants and messages')}
          />
          <div className="ml-auto flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>
              {t('orchestrationMonitor.participantsCount', '{{count}} participants', {
                count: data.participants.length
              })}
            </span>
            <span>
              {t('orchestrationMonitor.messagesCount', '{{count}} messages', {
                count: messages.length
              })}
            </span>
            <span>
              {t('orchestrationMonitor.waitingCount', '{{count}} awaiting answer', {
                count: messages.filter((message) => message.question === 'pending').length
              })}
            </span>
          </div>
        </div>
        <div className="mb-4 flex flex-wrap gap-2" aria-live="polite">
          {scopedHosts.map((host) => (
            <Badge
              key={host.id}
              variant={
                host.state === 'error' || host.state === 'offline' || host.state === 'unsupported'
                  ? 'warning'
                  : 'outline'
              }
            >
              {host.label} · {monitorLabel(t, host.state)}
              {host.snapshot
                ? ` · ${new Date(host.snapshot.capturedAt).toLocaleTimeString(locale)}`
                : ''}
            </Badge>
          ))}
        </div>
        {failedHosts.length ? (
          <div role="status" className="mb-4 rounded-md border p-3 text-sm">
            <p>
              {t(
                'orchestrationMonitor.hostFailure',
                'Some hosts could not be read. Retained records may be out of date. Refresh to retry.'
              )}
            </p>
            {failedHosts.map((host) => (
              <p key={host.id} className="mt-1 break-words text-xs text-muted-foreground">
                {host.label}: {host.error ?? monitorLabel(t, host.state)}
              </p>
            ))}
          </div>
        ) : null}
        {limited ? (
          <p className="mb-3 text-xs text-muted-foreground">
            {t(
              'orchestrationMonitor.bounded',
              'This view shows up to 200 recent messages, delegations, and registered participants per source on each host.'
            )}
          </p>
        ) : null}
        {scopedHosts.some((host) => host.snapshot?.omittedTerminalHosts.length) ? (
          <p className="mb-3 text-xs text-muted-foreground">
            {t(
              'orchestrationMonitor.omittedHosts',
              'Some terminal hosts could not be observed in this snapshot.'
            )}
          </p>
        ) : null}
        {!data.participants.length ? (
          <div className="rounded-xl border p-8 text-center">
            <Network className="mx-auto mb-4 size-6 text-muted-foreground" />
            <p className="text-sm">
              {needle
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
          <div className="grid min-w-0 items-start gap-4 @min-[1000px]/monitor:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-4">
              <MonitorRelationshipGraph
                data={data}
                relations={relations}
                selection={selection}
                onSelect={setSelection}
              />
              <section
                className="min-w-0 rounded-xl border bg-card text-card-foreground"
                aria-label={t('orchestrationMonitor.recentMessages', 'Recent messages')}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                  <h2 className="text-sm font-semibold">
                    {t('orchestrationMonitor.recentMessages', 'Recent messages')}{' '}
                    <span className="font-normal text-muted-foreground">
                      ({shownMessages.length})
                    </span>
                  </h2>
                  {selection?.kind === 'participant' || selectedRelation ? (
                    <Button variant="ghost" size="sm" onClick={() => setSelection(null)}>
                      {t('orchestrationMonitor.showAll', 'Show all')}
                    </Button>
                  ) : null}
                </div>
                <div className="scrollbar-sleek max-h-80 overflow-y-auto">
                  {shownMessages.length ? (
                    shownMessages.map((message) => (
                      <button
                        key={message.id}
                        type="button"
                        className={cn(
                          'block w-full min-w-0 space-y-2 border-b px-4 py-3 text-left last:border-0 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                          selection?.kind === 'message' &&
                            selection.id === message.id &&
                            'bg-accent'
                        )}
                        onClick={() => setSelection({ kind: 'message', id: message.id })}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="min-w-0 break-words text-xs text-muted-foreground">
                            {name(message.from)} → {name(message.to)} · {message.host.label}
                          </span>
                          <time
                            dateTime={message.createdAt}
                            className="text-2xs text-muted-foreground"
                          >
                            {new Date(message.createdAt).toLocaleTimeString(locale)}
                          </time>
                        </div>
                        <p className="break-words text-sm font-medium">{message.subject}</p>
                        <p className="line-clamp-2 break-words text-xs text-muted-foreground">
                          {message.preview}
                        </p>
                        <MonitorMessageBadges message={message} />
                      </button>
                    ))
                  ) : (
                    <p className="p-4 text-sm text-muted-foreground">
                      {t('orchestrationMonitor.noMessages', 'No messages in this scope.')}
                    </p>
                  )}
                </div>
              </section>
            </div>
            <MonitorDetails
              data={all}
              relations={relations}
              selection={selection}
              onSelect={setSelection}
            />
          </div>
        )}
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          {t(
            'orchestrationMonitor.scopeNote',
            'Shows Orca orchestration records and CLI clients registered through its MCP bridge. Unregistered terminals and their private conversations are not observable. Refreshes while this page is visible; viewing does not acknowledge messages.'
          )}
        </p>
      </div>
    </div>
  )
}
