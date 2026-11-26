import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { motionSafeScrollBehavior } from '@/hooks/theme/usePrefersReducedMotion'
import { MessageBody, MonitorMessageBadges } from './MonitorDetails'
import { MonitorParticipantAvatar } from './MonitorParticipantAvatar'
import { progressReason } from './monitor-operation-labels'
import type { MonitorConversation } from './monitor-conversations'
import type { MonitorData, MonitorSelection } from './monitor-host-snapshot'

export function MonitorConversationTimeline({
  data,
  room,
  onSelect
}: {
  data: MonitorData
  room: MonitorConversation
  onSelect: (selection: MonitorSelection) => void
}): React.JSX.Element {
  const t = useTranslate()
  const locale = useIntlLocale()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const scroll = useRef<HTMLDivElement>(null)
  const nearBottom = useRef(true)
  const participant = (id: string) => data.participants.find((item) => item.id === id)
  const name = (id: string) => participant(id)?.name ?? id
  const lastId = room.messages.at(-1)?.id
  useEffect(() => {
    if (nearBottom.current && scroll.current) {
      scroll.current.scrollTo({
        top: scroll.current.scrollHeight,
        behavior: motionSafeScrollBehavior()
      })
    }
  }, [room.id, lastId])
  return (
    <div
      ref={scroll}
      className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto p-4"
      onScroll={() => {
        const element = scroll.current
        if (element) {
          nearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80
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
                      {date.toLocaleTimeString(locale, {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </time>
                  </div>
                  <div className="space-y-2 rounded-xl border bg-background p-3 [overflow-wrap:anywhere]">
                    <p className="text-sm font-medium">{message.subject}</p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.preview}</p>
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
                      onClick={() => setExpandedId(expandedId === message.id ? null : message.id)}
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
  )
}
