import { useId, useLayoutEffect, useRef, useState } from 'react'
import { Bot, CircleHelp, MessageSquare, Terminal, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/class-names'
import { useTranslate } from '@/i18n/use-translate'
import type { MonitorData, MonitorSelection } from './monitor-host-snapshot'
import { layoutMonitorGraph, type MonitorRelation } from './monitor-relations'
import { monitorLabel, monitorParticipantHost } from './monitor-labels'

export function MonitorRelationshipGraph({
  data,
  relations,
  selection,
  onSelect
}: {
  data: MonitorData
  relations: MonitorRelation[]
  selection: MonitorSelection
  onSelect: (selection: MonitorSelection) => void
}): React.JSX.Element {
  const t = useTranslate()
  const marker = useId().replaceAll(':', '')
  const viewport = useRef<HTMLDivElement>(null)
  const [viewportWidth, setViewportWidth] = useState(800)
  useLayoutEffect(() => {
    const element = viewport.current
    if (!element) {
      return
    }
    const measure = () => setViewportWidth(element.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const selectedMessage =
    selection?.kind === 'message'
      ? data.messages.find((message) => message.id === selection.id)
      : null
  const selectedRelation =
    selection?.kind === 'relation'
      ? relations.find((relation) => relation.id === selection.id)
      : null
  const relevant = selectedMessage ?? selectedRelation
  const weights = new Map<string, number>()
  for (const relation of relations) {
    for (const id of [relation.from, relation.to]) {
      weights.set(
        id,
        (weights.get(id) ?? 0) + relation.messages.length + relation.assignments.length
      )
    }
  }
  const participants = [...data.participants]
    .sort((a, b) => {
      const selected = (id: string) =>
        (selection?.kind === 'participant' && selection.id === id) ||
        relevant?.from === id ||
        relevant?.to === id
      return (
        Number(selected(b.id)) - Number(selected(a.id)) ||
        (weights.get(b.id) ?? 0) - (weights.get(a.id) ?? 0) ||
        a.name.localeCompare(b.name)
      )
    })
    .slice(0, 32)
  const layout = layoutMonitorGraph(
    [...participants].sort((a, b) => a.id.localeCompare(b.id)),
    relations,
    viewportWidth
  )
  return (
    <section
      className="min-w-0 rounded-xl border bg-card text-card-foreground"
      aria-label={t('orchestrationMonitor.map', 'Relationship map')}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="text-sm font-semibold">
          {t('orchestrationMonitor.map', 'Relationship map')}
        </h2>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>→ {t('orchestrationMonitor.communication', 'Messages')}</span>
          <span>┄→ {t('orchestrationMonitor.delegation', 'Delegation')}</span>
          <span>
            {t('orchestrationMonitor.nodeCount', '{{shown}} / {{total}} participants', {
              shown: participants.length,
              total: data.participants.length
            })}
          </span>
        </div>
      </div>
      <div
        ref={viewport}
        className="scrollbar-sleek max-h-[480px] overflow-auto p-2"
        tabIndex={0}
        aria-label={t('orchestrationMonitor.mapScroll', 'Scroll relationship map')}
      >
        <div className="relative mx-auto" style={{ width: layout.width, height: layout.height }}>
          <svg
            width={layout.width}
            height={layout.height}
            className="absolute inset-0"
            aria-hidden="true"
          >
            <defs>
              <marker
                id={marker}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
              </marker>
            </defs>
            {relations.map((relation) => {
              const from = layout.positions.get(relation.from)
              const to = layout.positions.get(relation.to)
              if (!from || !to) {
                return null
              }
              const reverse = from.x > to.x
              const sameColumn = from.x === to.x
              const x1 = from.x + (reverse ? 0 : 192),
                y1 = from.y + 44,
                x2 = to.x + (reverse || sameColumn ? 192 : 0),
                y2 = to.y + 44
              const self = relation.from === relation.to
              const curve = self
                ? `M ${x1} ${y1} C ${x1 + 70} ${y1 - 80}, ${from.x - 40} ${y1 - 80}, ${from.x} ${y1}`
                : sameColumn
                  ? `M ${x1} ${y1} C ${x1 + 48} ${y1}, ${x2 + 48} ${y2}, ${x2} ${y2}`
                  : `M ${x1} ${y1} C ${x1 + (reverse ? -40 : 40)} ${y1}, ${x2 + (reverse ? 40 : -40)} ${y2}, ${x2} ${y2}`
              const active =
                selection?.id === relation.id ||
                (relevant?.from === relation.from && relevant?.to === relation.to) ||
                (selection?.kind === 'participant' &&
                  [relation.from, relation.to].includes(selection.id))
              return (
                <g
                  key={relation.id}
                  onClick={() => onSelect({ kind: 'relation', id: relation.id })}
                  className="cursor-pointer"
                >
                  <path d={curve} fill="none" stroke="transparent" strokeWidth={18} />
                  <path
                    d={curve}
                    fill="none"
                    stroke={active ? 'var(--foreground)' : 'var(--muted-foreground)'}
                    strokeOpacity={active ? 1 : 0.45}
                    strokeWidth={active ? 2 : 1.5}
                    strokeDasharray={relation.messages.length ? undefined : '5 5'}
                    markerEnd={`url(#${marker})`}
                  />
                </g>
              )
            })}
          </svg>
          {participants.map((participant) => {
            const position = layout.positions.get(participant.id)!
            const Icon =
              participant.kind === 'bot'
                ? Bot
                : participant.kind === 'terminal' || participant.kind === 'external'
                  ? Terminal
                  : participant.kind === 'unknown'
                    ? CircleHelp
                    : Users
            const active =
              (selection?.kind === 'participant' && selection.id === participant.id) ||
              relevant?.from === participant.id ||
              relevant?.to === participant.id
            return (
              <Button
                key={participant.id}
                variant="outline"
                className={cn(
                  'absolute h-[88px] w-48 flex-col items-start justify-center gap-1 overflow-hidden px-3 text-left whitespace-normal',
                  active && 'bg-accent text-accent-foreground',
                  participant.state === 'offline' && 'border-dashed'
                )}
                style={{ left: position.x, top: position.y }}
                aria-pressed={Boolean(active)}
                onClick={() => onSelect({ kind: 'participant', id: participant.id })}
              >
                <span className="flex w-full items-center gap-2">
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate font-medium">{participant.name}</span>
                </span>
                <span className="w-full truncate text-xs text-muted-foreground">
                  {participant.agent ?? monitorLabel(t, participant.kind)} ·{' '}
                  {monitorParticipantHost(t, participant)}
                </span>
                <span className="text-2xs text-muted-foreground">
                  {monitorLabel(t, participant.state)}
                </span>
              </Button>
            )
          })}
        </div>
      </div>
      <div
        className="flex max-h-24 flex-wrap gap-2 overflow-y-auto border-t px-4 py-3 scrollbar-sleek"
        aria-label={t('orchestrationMonitor.connections', 'Connections')}
      >
        {relations.length ? (
          relations.map((relation) => {
            const from = data.participants.find((participant) => participant.id === relation.from)
            const to = data.participants.find((participant) => participant.id === relation.to)
            return (
              <Button
                key={relation.id}
                variant="ghost"
                size="sm"
                className="h-auto max-w-full gap-2 text-xs"
                onClick={() => onSelect({ kind: 'relation', id: relation.id })}
                aria-pressed={selection?.id === relation.id}
              >
                <span className="truncate">
                  {from?.name ?? relation.from} → {to?.name ?? relation.to}
                </span>
                <Badge variant="secondary">
                  <MessageSquare className="mr-1 size-3" />
                  {relation.messages.length}
                </Badge>
              </Button>
            )
          })
        ) : (
          <p className="text-xs text-muted-foreground">
            {t(
              'orchestrationMonitor.noRelations',
              'No messages or delegations recorded in this scope.'
            )}
          </p>
        )}
      </div>
    </section>
  )
}
