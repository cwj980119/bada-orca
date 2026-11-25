import { BotAvatar, BotAvatarTile } from '@/components/bots/BotAvatar'
import type { MonitorData } from './monitor-host-snapshot'

export function MonitorParticipantAvatar({
  participant
}: {
  participant: MonitorData['participants'][number] | undefined
}): React.JSX.Element {
  if (participant?.kind === 'bot' && participant.address.startsWith('bot:')) {
    return (
      <BotAvatar
        bot={{
          id: participant.address.slice(4),
          name: participant.name,
          avatar: participant.avatar ?? null,
          hostId: participant.host.id
        }}
        className="size-8 text-sm"
      />
    )
  }
  return (
    <BotAvatarTile
      src={null}
      fallback={Array.from(participant?.name ?? '?')[0]}
      className="size-8 text-sm"
    />
  )
}
