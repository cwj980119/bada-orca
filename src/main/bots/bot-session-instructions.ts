// A bot session's launch instructions, recorded in its turn context as what its agent was given.
import type { AgentSessionRecord } from '../../shared/agent-session/lifecycle/agent-session-record'
import type { Bot } from '../../shared/bot-types'
import { intranetBotModel } from '../../shared/intranet/intranet-bot-model'
import { botOfHomeWorkspace } from '../../shared/bots/bot-homes'
import { botRulesBlock, botSessionPreamble } from './bot-preamble'
import { type BotHomeFilesystem, localBotHomeFilesystem } from './bot-home'
import type { BotTurnContext } from './bot-turn-context'

/** Agents that rebuild their system prompt from the instructions every start passes them (Pi's
 *  --append-system-prompt, Antigravity's reopen `_meta`); other agents keep a resumed thread's first
 *  ones. Claude records its prompt per conversation and reuses it on resume until compaction. */
const READS_INSTRUCTIONS_EACH_START: ReadonlySet<string> = new Set(['pi', 'antigravity'])

function startsFresh(record: BotSessionLaunch): boolean {
  return (
    READS_INSTRUCTIONS_EACH_START.has(record.provider) || record.providerHandleChain.length === 0
  )
}

/** Orca's Tools and Rules reach the context only when its prompt is built now: a fork may carry on
 *  its source's thread, so only an agent that rebuilds its prompt counts it as given. */
function rulesDelivered(record: BotSessionLaunch): boolean {
  return (
    READS_INSTRUCTIONS_EACH_START.has(record.provider) ||
    (record.providerHandleChain.length === 0 && !record.forkedFrom)
  )
}

type BotSessionLaunch = Pick<
  AgentSessionRecord,
  'sessionId' | 'provider' | 'instructionsKey' | 'forkedFrom' | 'options'
> & {
  location: Pick<AgentSessionRecord['location'], 'workspaceId'>
  /** Empty until the provider has a conversation to resume. */
  providerHandleChain: readonly unknown[]
}

export function botSessionInstructionResolver(
  context: Parameters<typeof botSessionInstructions>[0],
  bots: () => Parameters<typeof botSessionInstructions>[1],
  store: () => { getSettings?: () => { intranet?: unknown } }
) {
  return (record: BotSessionLaunch, directory: string, linked: string | null = null) =>
    botSessionInstructions(
      context,
      bots(),
      record,
      directory,
      linked,
      undefined,
      store().getSettings?.()?.intranet
    )
}

/** A bot session's preamble, read from the folder it runs in, recorded as what its agent has. */
export async function botSessionInstructions(
  context: Pick<BotTurnContext, 'launched' | 'linkedSkillsLaunched'>,
  bots: readonly (Pick<Bot, 'id' | 'name' | 'agent' | 'folderWorkspaceId'> &
    Partial<Pick<Bot, 'skillProjects' | 'launch'>>)[],
  record: BotSessionLaunch,
  launchDirectory: string,
  /** How to use its linked projects' skills; a resumed agent gets it on its next turn. */
  linkedSkills: string | null = null,
  fs: Pick<BotHomeFilesystem, 'readText'> = localBotHomeFilesystem,
  intranet?: unknown
): Promise<string | null> {
  const owner = botOfHomeWorkspace(bots, record.location.workspaceId)
  if (owner) {
    if (!record.options?.model) {
      throw new Error(
        '이 대화에는 사내 모델이 지정되어 있지 않습니다. Bot 설정에서 모델을 선택하고 새 홈 채팅을 시작해 주세요.'
      )
    }
    intranetBotModel(record.provider, record.options.model, intranet)
  }
  let neverLinked = false
  const preamble = await botSessionPreamble(
    bots,
    {
      sessionId: record.sessionId,
      workspaceId: record.location.workspaceId,
      launchDirectory,
      provider: record.provider
    },
    fs,
    (bot, files, agent) => {
      // Unlinking leaves an empty list, so a bot without one never had linked skills to replace.
      neverLinked = bot.skillProjects === undefined
      context.launched(record.sessionId, bot.id, launchDirectory, files, startsFresh(record), {
        block: botRulesBlock(agent),
        delivered: rulesDelivered(record),
        recorded: record.instructionsKey ?? null,
        rebuilt: READS_INSTRUCTIONS_EACH_START.has(record.provider)
      })
    }
  )
  if (preamble === null) {
    return null
  }
  context.linkedSkillsLaunched(
    record.sessionId,
    linkedSkills,
    startsFresh(record) || (neverLinked && linkedSkills === null)
  )
  return linkedSkills ? `${preamble}\n\n${linkedSkills}` : preamble
}
