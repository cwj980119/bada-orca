import { readIntranetSettings } from './intranet-settings'
import type { BotCreateParams, BotHostUpdates } from '../rpc-contract/bots-params'
import type { GlobalSettings } from '../settings/global-settings-types'
import type { Bot } from '../bot-types'
import { isIntranetAgent, supportsIntranetCliDefaults } from './intranet-features'
import { INTRANET_BOT_MODEL_REQUIRED, INTRANET_BOT_MODEL_UNREGISTERED } from './intranet-bot-errors'
import {
  intranetOpenCodeDefaultModel,
  intranetOpenCodeModelReference,
  intranetOpenCodeModels
} from './intranet-opencode-models'

export function intranetBotModel(
  agent: string,
  selected: string | undefined,
  value: unknown,
  requireModel = true
): string | undefined {
  const settings = readIntranetSettings(value)
  if (!isIntranetAgent(agent)) {
    throw new Error('사내 Bot에서 지원하는 실행 도구를 선택해 주세요.')
  }
  const allowed =
    agent === 'claude'
      ? settings.claude.model
        ? [settings.claude.model]
        : []
      : agent === 'opencode' || agent === 'opencode2'
        ? intranetOpenCodeModels(settings.opencode).map((model) =>
            intranetOpenCodeModelReference(settings.opencode, model.id)
          )
        : (settings.cliModels?.[agent]?.models.map((model) => model.id) ?? [])
  if (!allowed.length) {
    if (supportsIntranetCliDefaults(agent)) {
      return selected || undefined
    }
    if (!requireModel && !selected) {
      return undefined
    }
    throw new Error(INTRANET_BOT_MODEL_REQUIRED)
  }
  if (selected && !allowed.includes(selected)) {
    throw new Error(INTRANET_BOT_MODEL_UNREGISTERED)
  }
  return (
    selected ||
    (agent === 'claude'
      ? settings.claude.model
      : agent === 'opencode' || agent === 'opencode2'
        ? intranetOpenCodeDefaultModel(settings.opencode)
        : settings.cliModels?.[agent]?.model || allowed[0])
  )
}

export function intranetBotCreate(
  input: BotCreateParams,
  settings: Partial<Pick<GlobalSettings, 'intranet' | 'defaultTuiAgent'>>
): BotCreateParams {
  const preferred = settings.defaultTuiAgent
  const agent =
    input.agent ??
    (preferred === 'claude' || preferred === 'opencode2' || preferred === 'codex'
      ? preferred
      : 'opencode')
  const model = intranetBotModel(agent, input.launch?.model, settings.intranet, false)
  return { ...input, agent, ...(model ? { launch: { ...input.launch, model } } : {}) }
}

export function assertIntranetBotUpdate(
  bot: Bot,
  updates: BotHostUpdates,
  settings: unknown
): void {
  if (
    updates.slack ||
    updates.linear ||
    updates.github ||
    updates.slackApps?.length ||
    updates.linearWorkspaces?.length ||
    updates.members?.length ||
    updates.addMembers?.length ||
    updates.slackMirror
  ) {
    throw new Error('사내 Bot은 외부 계정·메신저 연동을 지원하지 않습니다.')
  }
  if (updates.agent !== undefined || updates.launch !== undefined) {
    intranetBotModel(bot.agent, bot.launch?.model, settings, false)
  }
}
