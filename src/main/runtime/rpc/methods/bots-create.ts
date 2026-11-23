// `bots.create`: the owner's New bot, in Orca (desktop or phone). A bot only proposes one
// (`bots.createOffer`); creating from its card records the new bot against that card.
import { assertBotAgentRunsOnThisHost } from '../../../bots/bot-agent-host-refusal'
import { BotCreate } from '../../../../shared/rpc-contract/bots-params'
import { botFirstKickoff } from '../../../../shared/bots/bot-import'
import { botMadeForWorkspacesKickoff } from '../../../../shared/bots/bot-made-for-workspaces'
import { runtimeBotChats } from '../../../bots/bot-chat-session'
import { ownerOnly } from './bots-caller-gates'
import { defineMethod, InvalidArgumentError } from '../core'
import { intranetBotCreate } from '../../../../shared/intranet/intranet-bot-model'

export const BOT_CREATE_METHOD = defineMethod({
  name: 'bots.create',
  permission: 'workspace',
  params: BotCreate,
  handler: async (
    { handOff, takingOver, fromOffer, fromShare, fromTemplate, ...authored },
    context
  ) => {
    const { runtime } = context
    const params = intranetBotCreate(authored, runtime.requireStore().getSettings())
    runtime.bots.assertEnabled()
    assertBotAgentRunsOnThisHost(params.agent)
    // A bot proposes new bots (`bot create --offer`); only its owner creates one, in Orca.
    ownerOnly(
      context,
      'A bot can’t create a bot. Propose one with `orca bot create --offer`; your owner creates it from the card.'
    )
    if (fromShare || fromTemplate) {
      throw new InvalidArgumentError('공개 Bot 공유·템플릿 설치는 사내 버전에서 지원하지 않습니다.')
    }
    let bot
    if (fromOffer) {
      if (!runtime.bots.list().some((entry) => entry.id === fromOffer.botId)) {
        throw new InvalidArgumentError('The bot that proposed this bot is gone.')
      }
      const made = await runtime.bots.createFromOffer({ ...params, fromOffer })
      if (made.existing) {
        // Already created from this card (another window, or Create and Edit at once): that bot,
        // with no second first turn.
        if (!made.bot) {
          throw new InvalidArgumentError('A bot was already created from that card, then deleted.')
        }
        return { bot: made.bot }
      }
      bot = made.bot!
    } else {
      bot = await runtime.bots.create(params)
    }
    // Made in Hand to bot: its first turn is the hand-over, once the workspace is under its home.
    if (takingOver) {
      return { bot }
    }
    // The bot speaks first: its first-run rules turn this into a greeting. Made for workspaces, it then
    // offers to take them over; made from another app's bot, its first turn brings that bot over; made
    // from a link, it says whose; made from a template, it says which.
    const first = runtimeBotChats(runtime).sendToChat(
      bot.id,
      handOff ? botMadeForWorkspacesKickoff(handOff) : botFirstKickoff(bot),
      'bot-created'
    )
    first.catch((error: unknown) => console.warn('[bots] first-run kickoff failed:', error))
    return { bot }
  }
})
