import { useState } from 'react'
import { ArrowLeft, MessageSquare, Plus, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BotGroupFaces } from '@/components/bots/BotGroupFaces'
import { BotGroupMembersDialog } from '@/components/bots/BotGroupMembersDialog'
import { botGroupFaces } from '../../../../shared/bots/bot-group-face-layout'
import type { Bot } from '../../../../shared/bot-types'
import type { BotGroup } from '../../../../shared/bots/bot-group'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import type { MonitorData, MonitorSelection } from './monitor-host-snapshot'
import { monitorConversations } from './monitor-conversations'
import { MonitorRoomAvatar } from './MonitorRoomAvatar'
import { MonitorConversationTimeline } from './MonitorConversationTimeline'

export function MonitorConversations({
  data,
  bots,
  groups,
  messageIds,
  onSelect
}: {
  data: MonitorData
  bots: readonly Bot[]
  groups: readonly BotGroup[]
  messageIds?: ReadonlySet<string>
  onSelect: (selection: MonitorSelection) => void
}): React.JSX.Element {
  const t = useTranslate()
  const locale = useIntlLocale()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dialog, setDialog] = useState<BotGroup | 'new' | null>(null)
  const nativeIds = new Set(
    groups.map((group) => JSON.stringify(['group', group.hostId, group.id]))
  )
  const history = monitorConversations(data.messages).filter(
    (item) => !messageIds || item.messages.some((message) => messageIds.has(message.id))
  )
  const participant = (id: string) => data.participants.find((item) => item.id === id)
  const name = (id: string) => participant(id)?.name ?? id
  const rooms = [
    ...groups.map((group) => {
      const id = JSON.stringify(['group', group.hostId, group.id])
      const transcript = history.find((item) => item.id === id) ?? {
        id,
        participants: [],
        messages: [],
        group: true
      }
      const last = transcript.messages.at(-1)
      const members = group.members.flatMap(
        (member) => bots.find((bot) => bot.hostId === group.hostId && bot.id === member.botId) ?? []
      )
      return {
        id,
        title: group.name,
        count: group.members.length,
        group: true,
        native: group,
        history: transcript,
        preview: last
          ? `${name(last.from)}: ${last.preview || last.subject}`
          : members.map((bot) => bot.name).join(', '),
        at: last ? new Date(last.createdAt).getTime() : group.createdAt,
        avatar: <BotGroupFaces faces={botGroupFaces(members, (bot) => bot.id)} className="size-7" />
      }
    }),
    ...history
      .filter((room) => !nativeIds.has(room.id))
      .map((room) => {
        const last = room.messages.at(-1)!
        return {
          id: room.id,
          title: room.participants.map(name).join(', '),
          count: room.participants.length,
          group: room.group,
          native: undefined,
          history: room,
          preview: `${name(last.from)}: ${last.preview || last.subject}`,
          at: new Date(last.createdAt).getTime(),
          avatar: (
            <MonitorRoomAvatar
              participants={room.participants.flatMap((id) => participant(id) ?? [])}
            />
          )
        }
      })
  ].sort((a, b) => b.at - a.at)
  const room = rooms.find((item) => item.id === selectedId) ?? rooms[0]
  const choose = (id: string) => {
    setSelectedId(id)
    setMobileOpen(true)
  }
  const conversations = t('orchestrationMonitor.conversations', 'Conversations')
  const newGroup = t('bots.groups.newGroup', 'New group')
  return (
    <>
      <section
        className="@container/conversations h-[640px] w-full min-w-0 overflow-hidden rounded-xl border bg-card text-card-foreground"
        aria-label={conversations}
      >
        <div className="grid h-full min-w-0 @min-[480px]/conversations:grid-cols-[192px_minmax(0,1fr)] @min-[700px]/conversations:grid-cols-[240px_minmax(0,1fr)]">
          <nav
            aria-label={conversations}
            className={cn(
              'scrollbar-sleek min-h-0 overflow-y-auto border-r',
              mobileOpen && room && '@max-[480px]/conversations:hidden'
            )}
          >
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <h2 className="min-w-0 flex-1 text-sm font-semibold">
                {conversations} <span className="text-muted-foreground">{rooms.length}</span>
              </h2>
              <Button
                variant="ghost"
                size="icon"
                aria-label={newGroup}
                title={newGroup}
                disabled={
                  !bots.some((bot) =>
                    bots.some((other) => other.hostId === bot.hostId && other.id !== bot.id)
                  )
                }
                onClick={() => setDialog('new')}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            {rooms.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={room?.id === item.id ? 'true' : undefined}
                className={cn(
                  'flex w-full gap-3 border-b p-3 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  room?.id === item.id && 'bg-accent'
                )}
                onClick={() => choose(item.id)}
              >
                {item.avatar}
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
                    <span className="ml-auto shrink-0">{item.count}</span>
                  </span>
                  <span className="block truncate text-sm font-medium">{item.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.preview}
                  </span>
                  <time
                    dateTime={new Date(item.at).toISOString()}
                    className="block text-2xs text-muted-foreground"
                  >
                    {new Date(item.at).toLocaleString(locale, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </time>
                </span>
              </button>
            ))}
            {!rooms.length ? (
              <p className="p-4 text-sm text-muted-foreground">
                {t('orchestrationMonitor.noMessages', 'No messages in this scope.')}
              </p>
            ) : null}
          </nav>
          <div
            className={cn(
              'min-h-0 min-w-0 flex-col',
              mobileOpen && room ? 'flex' : 'hidden @min-[480px]/conversations:flex'
            )}
          >
            {room ? (
              <>
                <header className="flex items-center gap-2 border-b px-4 py-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 @min-[480px]/conversations:hidden"
                    aria-label={conversations}
                    onClick={() => setMobileOpen(false)}
                  >
                    <ArrowLeft className="size-4" />
                  </Button>
                  {room.avatar}
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-semibold">{room.title}</h2>
                    <p className="text-xs text-muted-foreground">
                      {room.group
                        ? t('orchestrationMonitor.groupChat', 'Group conversation')
                        : t('orchestrationMonitor.directChat', 'Direct conversation')}{' '}
                      · {room.count}
                    </p>
                  </div>
                  {room.native ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('bots.groups.members', 'Members')}
                      onClick={() => setDialog(room.native!)}
                    >
                      <Users className="size-4" />
                    </Button>
                  ) : null}
                  <Badge variant="outline">{t('orchestrationMonitor.history', 'History')}</Badge>
                </header>
                <MonitorConversationTimeline
                  key={room.id}
                  data={data}
                  room={room.history}
                  onSelect={onSelect}
                />
              </>
            ) : null}
          </div>
        </div>
      </section>
      {dialog ? (
        <BotGroupMembersDialog
          group={dialog === 'new' ? undefined : dialog}
          onClose={() => setDialog(null)}
          onCreated={(group) => {
            choose(JSON.stringify(['group', group.hostId, group.id]))
            setDialog(null)
          }}
        />
      ) : null}
    </>
  )
}
