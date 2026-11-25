import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, MessageSquare, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { motionSafeScrollBehavior } from '@/hooks/theme/usePrefersReducedMotion'
import { MessageBody, MonitorMessageBadges } from './MonitorDetails'
import type { MonitorData, MonitorSelection } from './monitor-host-snapshot'
import { monitorConversations } from './monitor-conversations'
import { MonitorParticipantAvatar } from './MonitorParticipantAvatar'
import { progressReason } from './monitor-operation-labels'

export function MonitorConversations({
  data,
  messageIds,
  onSelect
}: {
  data: MonitorData
  messageIds?: ReadonlySet<string>
  onSelect: (selection: MonitorSelection) => void
}): React.JSX.Element {
  const t = useTranslate()
  const locale = useIntlLocale()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const scroll = useRef<HTMLDivElement>(null)
  const nearBottom = useRef(true)
  const rooms = monitorConversations(data.messages).filter(
    (item) => !messageIds || item.messages.some((message) => messageIds.has(message.id))
  )
  const room = rooms.find((item) => item.id === selectedId) ?? rooms[0]
  const participant = (id: string) => data.participants.find((item) => item.id === id)
  const name = (id: string) => participant(id)?.name ?? id
  const title = (ids: string[]) => ids.map(name).join(', ')
  const roomId = room?.id
  const lastId = room?.messages.at(-1)?.id
  useEffect(() => {
    if (selectedId === null && roomId) {
      setSelectedId(roomId)
    }
  }, [selectedId, roomId])
  useEffect(() => {
    if (nearBottom.current && scroll.current) {
      scroll.current.scrollTo({
        top: scroll.current.scrollHeight,
        behavior: motionSafeScrollBehavior()
      })
    }
  }, [roomId, lastId])
  if (!room) {
    return (
      <p className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
        {t('orchestrationMonitor.noMessages', 'No messages in this scope.')}
      </p>
    )
  }
  return (
    <section
      className="grid h-[640px] min-w-0 overflow-hidden rounded-xl border bg-card text-card-foreground @min-[700px]/monitor:grid-cols-[240px_minmax(0,1fr)]"
      aria-label={t('orchestrationMonitor.conversations', 'Conversations')}
    >
      <nav
        aria-label={t('orchestrationMonitor.conversations', 'Conversations')}
        className={cn(
          'scrollbar-sleek min-h-0 overflow-y-auto border-r',
          mobileOpen && 'hidden @min-[700px]/monitor:block'
        )}
      >
        <h2 className="border-b px-4 py-3 text-sm font-semibold">
          {t('orchestrationMonitor.conversations', 'Conversations')}{' '}
          <span className="text-muted-foreground">{rooms.length}</span>
        </h2>
        {rooms.map((item) => {
          const last = item.messages.at(-1)!
          return (
            <button
              key={item.id}
              type="button"
              aria-current={room.id === item.id ? 'true' : undefined}
              className={cn(
                'flex w-full gap-3 border-b p-3 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                room.id === item.id && 'bg-accent'
              )}
              onClick={() => {
                setSelectedId(item.id)
                setExpandedId(null)
                setMobileOpen(true)
                nearBottom.current = true
              }}
            >
              <MonitorParticipantAvatar participant={participant(last.from)} />
              <span className="min-w-0 flex-1 space-y-1">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {item.group ? (
                    <Users className="size-3 shrink-0" />
                  ) : (
                    <MessageSquare className="size-3 shrink-0" />
                  )}
                  {item.group
                    ? t('orchestrationMonitor.groupChat', 'Group conversation')
                    : t('orchestrationMonitor.directChat', 'Direct conversation')}
                  <span className="ml-auto shrink-0">{item.participants.length}</span>
                </span>
                <span className="block truncate text-sm font-medium">
                  {title(item.participants)}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {name(last.from)}: {last.preview || last.subject}
                </span>
                <span className="block text-2xs text-muted-foreground">
                  {last.host.label} ·{' '}
                  {new Date(last.createdAt).toLocaleString(locale, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </span>
            </button>
          )
        })}
      </nav>
      <div
        className={cn(
          'min-h-0 min-w-0 flex-col',
          mobileOpen ? 'flex' : 'hidden @min-[700px]/monitor:flex'
        )}
      >
        <header className="flex items-center gap-2 border-b px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 @min-[700px]/monitor:hidden"
            aria-label={t('orchestrationMonitor.conversations', 'Conversations')}
            onClick={() => setMobileOpen(false)}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold">{title(room.participants)}</h2>
            <p className="text-xs text-muted-foreground">
              {room.group
                ? t('orchestrationMonitor.groupChat', 'Group conversation')
                : t('orchestrationMonitor.directChat', 'Direct conversation')}{' '}
              ·{' '}
              {t('orchestrationMonitor.messagesCount', '{{count}} messages', {
                count: room.messages.length
              })}
            </p>
          </div>
          <Badge variant="outline">{t('orchestrationMonitor.history', 'History')}</Badge>
        </header>
        <div
          ref={scroll}
          className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto p-4"
          onScroll={() => {
            const element = scroll.current
            if (element) {
              nearBottom.current =
                element.scrollHeight - element.scrollTop - element.clientHeight < 80
            }
          }}
        >
          <ol className="space-y-4">
            {room.messages.map((message, index) => {
              const previous = room.messages[index - 1]
              const date = new Date(message.createdAt)
              const day = date.toLocaleDateString(locale)
              const dayChanged =
                !previous || new Date(previous.createdAt).toLocaleDateString(locale) !== day
              return (
                <li key={message.id}>
                  {dayChanged ? (
                    <div className="mb-4 flex items-center gap-3 text-2xs text-muted-foreground">
                      <span className="h-px flex-1 bg-border" />
                      <time dateTime={message.createdAt}>{day}</time>
                      <span className="h-px flex-1 bg-border" />
                    </div>
                  ) : null}
                  <article className="flex min-w-0 gap-3">
                    <MonitorParticipantAvatar participant={participant(message.from)} />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <button
                          type="button"
                          className="break-words text-sm font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => onSelect({ kind: 'participant', id: message.from })}
                        >
                          {name(message.from)}
                        </button>
                        <span className="break-words text-xs text-muted-foreground">
                          → {name(message.to)}
                        </span>
                        <time
                          dateTime={message.createdAt}
                          title={date.toLocaleString(locale)}
                          className="text-2xs text-muted-foreground"
                        >
                          {date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                        </time>
                      </div>
                      <div className="space-y-2 rounded-xl border bg-background p-3 [overflow-wrap:anywhere]">
                        <p className="text-sm font-medium">{message.subject}</p>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {message.preview}
                        </p>
                        {message.threadId ? (
                          <p className="text-xs text-muted-foreground">
                            {t('orchestrationMonitor.thread', 'Reply to')}:{' '}
                            {data.messages.find(
                              (item) =>
                                item.host.id === message.host.id && item.rawId === message.threadId
                            )?.subject ?? message.threadId}
                          </p>
                        ) : null}
                        <MonitorMessageBadges message={message} />
                        {message.progress ? (
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {progressReason(t, message.progress.reason)}
                          </p>
                        ) : null}
                        <Button
                          variant="link"
                          size="inlineText"
                          aria-expanded={expandedId === message.id}
                          onClick={() =>
                            setExpandedId(expandedId === message.id ? null : message.id)
                          }
                        >
                          {t('orchestrationMonitor.body', 'Original message')}
                        </Button>
                        {expandedId === message.id ? <MessageBody message={message} /> : null}
                      </div>
                    </div>
                  </article>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </section>
  )
}
