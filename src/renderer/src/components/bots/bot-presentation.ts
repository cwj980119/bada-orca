import { getAgentLabel } from '@/lib/agent-catalog/agent-catalog'
import { translate } from '@/i18n/i18n'
import type { Translate } from '@/i18n/use-translate'
import type { TerminalAgent } from '../../../../shared/agent-status/identity/terminal-agent'
import { isIntranetBotModelError } from '../../../../shared/intranet/intranet-bot-errors'

/** Bots name their agent as the product does ("Claude Code"); the shared catalog's "Claude" stays app-wide. */
export function botAgentLabel(agent: TerminalAgent, t: Translate = translate): string {
  return agent === 'claude' ? t('bots.new.agentClaude', 'Claude Code') : getAgentLabel(agent)
}

const IS_WINDOWS = navigator.userAgent.includes('Windows')

/** A bot's home, shown from the user's home rather than as a full path. */
export function botFolderDisplay(folder: string, windows = IS_WINDOWS): string {
  return windows ? `%USERPROFILE%\\.orca\\bots\\${folder}` : `~/.orca/bots/${folder}`
}

export function botErrorMessage(error: unknown, t: Translate = translate): string {
  if (isIntranetBotModelError(error)) {
    return t(
      'intranet.bots.modelRequired',
      'A company model must be registered for this CLI before the bot can chat. Configure it in Intranet settings, then open the bot again.'
    )
  }
  // Runtime errors carry the controller's code as their message.
  if (error instanceof Error && error.message === 'bot_name_taken') {
    return t('bots.errors.nameTaken', 'Another bot already has that name.')
  }
  if (error instanceof Error && error.message === 'bot_avatar_invalid') {
    return t(
      'bots.errors.avatarInvalid',
      'That picture could not be used. Pick a PNG or JPG image.'
    )
  }
  return t('bots.errors.generic', 'Something went wrong. Try again.')
}
