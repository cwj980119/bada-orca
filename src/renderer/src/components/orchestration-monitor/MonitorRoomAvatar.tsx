import { BotGroupFaces } from '@/components/bots/BotGroupFaces'
import { botGroupFaces } from '../../../../shared/bots/bot-group-face-layout'
import type { MonitorData } from './monitor-host-snapshot'

export function MonitorRoomAvatar({
  participants
}: {
  participants: readonly MonitorData['participants'][number][]
}): React.JSX.Element {
  const members = participants.map((participant) => ({
    id: participant.address.startsWith('bot:') ? participant.address.slice(4) : participant.id,
    name: participant.name,
    avatar: participant.avatar ?? null,
    hostId: participant.host.id
  }))
  return <BotGroupFaces faces={botGroupFaces(members, (member) => member.id)} className="size-7" />
}
