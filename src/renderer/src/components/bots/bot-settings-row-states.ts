// The one-line state under each row of a bot's panel Settings list.
import { translate } from '@/i18n/i18n'
import type { Translate } from '@/i18n/use-translate'
import { uiDateTimeFormat } from '@/i18n/ui-intl-formatters'
import type { BotTools } from '../../../../shared/bot-tools'
import { lookedDay, type BotLookAround } from '../../../../shared/bots/bot-look-around'
import type { BotTidyUp } from '../../../../shared/bots/bot-tidy-up'
import { botToolTitle } from '../../../../shared/bots/bot-tool-labels'

const CLOCK = { hour: 'numeric', minute: '2-digit' } as const
const DATE = { month: 'short', day: 'numeric' } as const

const off = (t: Translate = translate): string => t('bots.settingsPage.off', 'Off')
const none = (t: Translate = translate): string => t('bots.settingsPage.none', 'None')

/** Names as a short list: "Slack, GitHub". */
export function nameList(names: readonly string[], intlLocale?: string): string {
  return new Intl.ListFormat(intlLocale, { type: 'unit', style: 'short' }).format(names)
}

/** "12:04 PM" today, "yesterday 4:12 PM", then "Oct 29". */
function lookedWhen(
  at: number,
  now: number,
  t: Translate = translate,
  intlLocale?: string
): string {
  const day = lookedDay(at, now)
  if (day === 'earlier') {
    return uiDateTimeFormat(DATE, intlLocale).format(at)
  }
  const time = uiDateTimeFormat(CLOCK, intlLocale).format(at)
  return day === 'today' ? time : t('bots.settingsPage.yesterdayAt', 'yesterday {{time}}', { time })
}

/** "today", "yesterday", then "Oct 29". */
function tidiedWhen(
  at: number,
  now: number,
  t: Translate = translate,
  intlLocale?: string
): string {
  const day = lookedDay(at, now)
  return day === 'today'
    ? t('bots.settingsPage.today', 'today')
    : day === 'yesterday'
      ? t('bots.settingsPage.yesterday', 'yesterday')
      : uiDateTimeFormat(DATE, intlLocale).format(at)
}

/** "Every 4 hours, 8 AM to 8 PM · last looked 12:04 PM". */
export function lookAroundLine(
  setting: BotLookAround,
  lastLookedAt: number | undefined,
  now = Date.now(),
  t: Translate = translate,
  intlLocale?: string
): string {
  if (!setting.on) {
    return off(t)
  }
  const every = {
    'every-4h': t('intranet.bots.every4h', 'Every 4 hours, 8 AM to 8 PM'),
    'every-2h': t('intranet.bots.every2h', 'Every 2 hours, 8 AM to 8 PM'),
    'twice-daily': t('intranet.bots.twiceDaily', 'Twice daily, 8 AM and 1 PM'),
    mornings: t('intranet.bots.mornings', 'Every morning at 8 AM')
  }[setting.every]
  return lastLookedAt
    ? `${every} · ${t('bots.settingsPage.lastLooked', 'last looked {{when}}', {
        when: lookedWhen(lastLookedAt, now, t, intlLocale)
      })}`
    : every
}

/** "Each night after 3 AM, or once this computer is awake · last tidied today". */
export function tidyUpLine(
  setting: BotTidyUp,
  lastTidiedAt: number | undefined,
  now = Date.now(),
  t: Translate = translate,
  intlLocale?: string
): string {
  if (!setting.on) {
    return off(t)
  }
  const every =
    setting.every === 'night'
      ? t(
          'settings.bots.tidyUp.everyNightLine',
          'Each night after 3 AM, or once this computer is awake'
        )
      : t(
          'settings.bots.tidyUp.everyWeekLine',
          'Once a week after 3 AM, or once this computer is awake'
        )
  return lastTidiedAt
    ? `${every} · ${t('bots.settingsPage.lastTidied', 'last tidied {{when}}', {
        when: tidiedWhen(lastTidiedAt, now, t, intlLocale)
      })}`
    : every
}

/** "MEMORY.md and 6 topic files"; just "MEMORY.md" with none, or before the folder is read. */
export function memoryLine(topicFiles: number | null, t: Translate = translate): string {
  return topicFiles
    ? t('bots.settingsPage.memoryFiles', 'MEMORY.md and {{count}} topic files', {
        count: topicFiles,
        defaultValue_one: 'MEMORY.md and {{count}} topic file'
      })
    : 'MEMORY.md'
}

/** "Sentry, Playwright · 6 more from Claude Code"; null until the tools are read. */
export function toolsLine(
  tools: BotTools | null,
  agentLabel: string,
  intlLocale?: string,
  t: Translate = translate
): string | null {
  if (!tools) {
    return null
  }
  if ('unsupported' in tools) {
    return t('bots.settingsPage.toolsInAgent', 'Set up in {{agent}}', {
      agent: agentLabel
    })
  }
  const own = tools.own.map((tool) => botToolTitle(tool.name))
  const inherited = tools.inherited.length
  if (own.length === 0) {
    return inherited > 0
      ? t('bots.settingsPage.toolsFrom', '{{count}} from {{agent}}', {
          count: inherited,
          agent: agentLabel
        })
      : none(t)
  }
  const names = nameList(own, intlLocale)
  return inherited > 0
    ? `${names} · ${t('bots.settingsPage.toolsMore', '{{count}} more from {{agent}}', {
        count: inherited,
        agent: agentLabel
      })}`
    : names
}

/** Names, or "None". */
export function namesLine(names: readonly string[], intlLocale?: string, t?: Translate): string {
  return names.length > 0 ? nameList(names, intlLocale) : none(t)
}

/** "Slack 3 with access · Linear 2 with access · 1 request"; "Only you" with nobody added. */
export function whoCanAskLine(
  connectors: readonly { label: string; people: number }[],
  requests: number
): string {
  const parts = connectors
    .filter((connector) => connector.people > 0)
    .map((connector) =>
      translate('bots.settingsPage.withAccess', '{{service}} {{people}} with access', {
        service: connector.label,
        people: connector.people
      })
    )
  if (requests > 0) {
    parts.push(
      translate('settings.bots.connectorRequests', '{{count}} requests', {
        count: requests,
        defaultValue_one: '{{count}} request'
      })
    )
  }
  return parts.length > 0 ? parts.join(' · ') : translate('bots.settingsPage.onlyYou', 'Only you')
}
