import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { useTranslate } from '@/i18n/use-translate'
import {
  mergeMonitorHosts,
  type MonitorHostSnapshot,
  type MonitorSelection
} from './monitor-host-snapshot'
import { monitorRelations } from './monitor-relations'
import { MonitorHostPicker, MonitorHostStatus } from './MonitorHosts'
import { MonitorHeader } from './MonitorHeader'
import { MonitorWorkspace } from './MonitorWorkspace'
import type { Bot } from '../../../../shared/bot-types'
import type { BotGroup } from '../../../../shared/bots/bot-group'

const NO_BOTS: readonly Bot[] = []
const NO_GROUPS: readonly BotGroup[] = []

export function OrchestrationMonitorView({
  hosts,
  bots = NO_BOTS,
  groups = NO_GROUPS,
  refreshing,
  onRefresh,
  onBack,
  onConfigure
}: {
  hosts: readonly MonitorHostSnapshot[]
  bots?: readonly Bot[]
  groups?: readonly BotGroup[]
  refreshing: boolean
  onRefresh: () => void
  onBack: () => void
  onConfigure: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const [hostId, setHostId] = useState('all')
  const [query, setQuery] = useState('')
  const [selection, setSelection] = useState<MonitorSelection>(null)
  const scopedHosts = useMemo(
    () => hosts.filter((host) => hostId === 'all' || host.id === hostId),
    [hosts, hostId]
  )
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
  const requests = all.requests.filter(
    (message) =>
      !needle ||
      matchesParties(message.from, message.to) ||
      `${message.subject} ${message.preview}`.toLocaleLowerCase().includes(needle)
  )
  const visibleIds = new Set([
    ...matchingParticipants,
    ...messages.flatMap((message) => [message.from, message.to]),
    ...requests.flatMap((message) => [message.from, message.to]),
    ...assignments.flatMap((assignment) => [assignment.from, assignment.to])
  ])
  const data = {
    participants: all.participants.filter((participant) => visibleIds.has(participant.id)),
    messages,
    requests,
    assignments
  }
  const relations = monitorRelations(data)
  const selectedRelation =
    selection?.kind === 'relation'
      ? relations.find((relation) => relation.id === selection.id)
      : null
  const conversationMessageIds = new Set(
    (selection?.kind === 'participant'
      ? messages.filter((message) => [message.from, message.to].includes(selection.id))
      : selectedRelation
        ? selectedRelation.messages
        : messages
    ).map((message) => message.id)
  )
  const loaded = scopedHosts.some((host) => host.snapshot)
  const limited = scopedHosts.some(
    (host) => host.snapshot && Object.values(host.snapshot.limits).some(Boolean)
  )

  return (
    <div className="@container/monitor flex h-full min-h-0 min-w-0 flex-col bg-background text-foreground">
      <MonitorHeader
        refreshing={refreshing}
        onBack={onBack}
        onConfigure={onConfigure}
        onRefresh={onRefresh}
      />
      <div className="scrollbar-sleek min-h-0 flex-1 overflow-auto p-4 lg:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="w-48">
            <MonitorHostPicker
              hosts={hosts}
              value={hostId}
              onChange={(value) => {
                setHostId(value)
                setSelection(null)
              }}
            />
          </div>
          <Input
            className="w-72 max-w-full"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={t('orchestrationMonitor.search', 'Search participants, messages, and work')}
            placeholder={t(
              'orchestrationMonitor.search',
              'Search participants, messages, and work'
            )}
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
        <MonitorHostStatus hosts={scopedHosts} />
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
        <MonitorWorkspace
          bots={bots.filter((bot) => scopedHosts.some((host) => host.id === bot.hostId))}
          groups={groups.filter(
            (group) =>
              scopedHosts.some((host) => host.id === group.hostId) &&
              (!needle ||
                group.name.toLocaleLowerCase().includes(needle) ||
                bots.some(
                  (bot) =>
                    bot.hostId === group.hostId &&
                    group.members.some((member) => member.botId === bot.id) &&
                    bot.name.toLocaleLowerCase().includes(needle)
                ))
          )}
          all={all}
          data={data}
          hosts={scopedHosts}
          relations={relations}
          selection={selection}
          onSelect={setSelection}
          conversationMessageIds={conversationMessageIds}
          query={query}
          loaded={loaded}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onConfigure={onConfigure}
        />
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
