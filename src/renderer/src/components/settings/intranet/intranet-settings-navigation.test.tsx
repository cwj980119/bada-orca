// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type * as Sonner from 'sonner'
import { useAppStore } from '@/store'
import { IntranetBotConnectionNotice } from './IntranetBotConnectionNotice'
import { BotChatUnavailableNotice } from '../../bots/BotChatUnavailableNotice'
import { BotCliDiscoveryNotice } from '../../bots/BotCliDiscoveryNotice'
import { showBotChatOpenError } from '../../bots/bot-chat-open-error'
import { INTRANET_BOT_MODEL_REQUIRED } from '../../../../../shared/intranet/intranet-bot-errors'
import type { UseDetectedAgentsResult } from '@/lib/agent-session/launch/inventory/useDetectedAgents'

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }))
vi.mock('sonner', async (original) => {
  const module = await original<typeof Sonner>()
  return { ...module, toast: Object.assign(module.toast, { error: toastError }) }
})
vi.mock('@/i18n/use-translate', () => ({
  useTranslate: () => (_key: string, fallback: string) => fallback
}))

const inventory: UseDetectedAgentsResult = {
  detectedIds: ['codex'],
  isLoading: false,
  detectionFailed: false,
  isRefreshing: false,
  needsServerUpdate: false,
  refresh: async () => ['codex']
}
const error = new Error(INTRANET_BOT_MODEL_REQUIRED)
beforeEach(() => {
  useAppStore.setState({
    activeView: 'terminal',
    previousViewBeforeSettings: 'activity',
    settingsNavigationTarget: null,
    settingsSearchInputQuery: 'old search'
  })
  toastError.mockReset()
})
afterEach(cleanup)

it.each([
  () => <IntranetBotConnectionNotice />,
  () => <BotChatUnavailableNotice error={error} pending={false} onRetry={() => {}} />,
  () => <BotCliDiscoveryNotice inventory={inventory} choices={['codex']} />
])(
  'opens the settings page and target from a bot connection button, preserving the way back',
  (notice) => {
    render(notice())
    fireEvent.click(screen.getByRole('button', { name: /Configure company models and MCP/ }))
    expect(useAppStore.getState()).toMatchObject({
      activeView: 'settings',
      settingsNavigationTarget: { pane: 'intranet', repoId: null },
      settingsSearchInputQuery: '',
      previousViewBeforeSettings: 'terminal'
    })
    useAppStore.getState().closeSettingsPage()
    expect(useAppStore.getState().activeView).toBe('terminal')
  }
)

it('opens settings from the failed-chat notification action', () => {
  showBotChatOpenError({ hostId: 'local', id: 'bot' }, error)
  const options = toastError.mock.calls[0]?.[1] as { action: { onClick: () => void } }
  options.action.onClick()
  expect(useAppStore.getState()).toMatchObject({
    activeView: 'settings',
    settingsNavigationTarget: { pane: 'intranet', repoId: null },
    settingsSearchInputQuery: ''
  })
})

it('clears an old settings search without losing the previous page when settings is already open', () => {
  useAppStore.setState({ activeView: 'settings', previousViewBeforeSettings: 'activity' })
  render(<IntranetBotConnectionNotice />)
  fireEvent.click(screen.getByRole('button', { name: /Configure company models and MCP/ }))
  expect(useAppStore.getState()).toMatchObject({
    activeView: 'settings',
    settingsSearchInputQuery: '',
    previousViewBeforeSettings: 'activity',
    settingsNavigationTarget: { pane: 'intranet', repoId: null }
  })
})
