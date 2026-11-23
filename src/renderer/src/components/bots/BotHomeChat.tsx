import { useEffect, useState } from 'react'
import { openBotChat } from '@/lib/bot-catalog'
import { useBotForWorkspace } from './bot-workspace'
import { useAppStore } from '@/store'
import { BotChatUnavailableNotice } from './BotChatUnavailableNotice'

/** A bot's page always has its Home tab; the runtime keeps the Chat or makes a new one, e.g. after an agent change. */
export function BotHomeChat({ workspaceId }: { workspaceId: string }): React.JSX.Element | null {
  const bot = useBotForWorkspace(workspaceId)
  const botId = bot?.id ?? null
  const hostId = bot?.hostId ?? null
  const agent = bot?.agent ?? null
  const intranet = useAppStore((state) => state.settings?.intranet)
  const [failure, setFailure] = useState<{ botId: string; hostId: string; error: unknown } | null>(
    null
  )
  const [attempt, setAttempt] = useState(0)
  const [pending, setPending] = useState(false)
  useEffect(() => {
    let active = true
    if (botId && hostId) {
      void openBotChat({ hostId, id: botId }).then(
        () => {
          if (active) {
            setFailure(null)
            setPending(false)
          }
        },
        (error: unknown) => {
          if (active) {
            setFailure({ botId, hostId, error })
            setPending(false)
          }
        }
      )
    }
    return () => {
      active = false
    }
  }, [botId, hostId, agent, intranet, attempt])
  if (!bot || failure?.botId !== botId || failure.hostId !== hostId) {
    return null
  }
  return (
    <BotChatUnavailableNotice
      error={failure.error}
      pending={pending}
      onRetry={() => {
        setPending(true)
        setAttempt((value) => value + 1)
      }}
    />
  )
}
