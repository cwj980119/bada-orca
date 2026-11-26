import { useEffect, useReducer } from 'react'
import { onBotsChanged } from '@/lib/bots-changed-window-event'
import { callBotRpc, type BotRef } from '@/lib/bot-hosts'
import {
  reduceBotGroupTranscript,
  type BotGroupTranscript
} from '../../../../shared/bots/bot-group-transcript'

function readPage(
  group: BotRef,
  threadId: string | undefined,
  beforeSequence?: number,
  changes?: { afterChange?: number; revision?: number }
): Promise<BotGroupTranscript> {
  return callBotRpc(group, 'bots.groups.read', {
    groupId: group.id,
    threadId,
    beforeSequence,
    ...changes
  })
}

export function useBotGroupTranscript(
  group: BotRef | undefined,
  threadId: string | undefined,
  isVisible: boolean,
  setError: (message: string | null) => void
) {
  const [data, apply] = useReducer(reduceBotGroupTranscript, null)
  const groupId = group?.id
  const hostId = group?.hostId
  useEffect(() => {
    if (!groupId || !hostId || !isVisible) {
      return
    }
    const ref = { hostId, id: groupId }
    let closed = false
    let reading = false
    let dirty = false
    let cursor: number | undefined
    let revision: number | undefined
    const pump = async () => {
      reading = true
      try {
        while (dirty && !closed) {
          dirty = false
          const page = await readPage(ref, threadId, undefined, { afterChange: cursor, revision })
          if (closed) {
            return
          }
          apply({ kind: 'recent', page })
          cursor = page.cursor
          revision = page.group.revision
          dirty ||= page.hasMoreChanges === true
          setError(null)
        }
      } catch (error) {
        dirty = false
        if (!closed) {
          setError(String(error))
        }
      } finally {
        reading = false
      }
    }
    const read = () => {
      dirty = true
      if (!reading) {
        void pump()
      }
    }
    read()
    const stopListening = onBotsChanged(read, hostId, { kinds: ['groups'] })
    return () => {
      closed = true
      stopListening()
    }
  }, [apply, groupId, hostId, threadId, isVisible, setError])
  const loadEarlier = () => {
    if (data?.hasEarlier) {
      void readPage(data.group, threadId, data.messages[0]?.sequence)
        .then((page) => apply({ kind: 'earlier', page }))
        .catch((error: unknown) => setError(String(error)))
    }
  }
  return { data, apply, loadEarlier }
}
