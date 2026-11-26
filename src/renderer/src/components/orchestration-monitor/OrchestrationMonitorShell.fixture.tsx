import { defineFixture } from '../../component-fixtures/component-fixture'
import { setRendererUiLanguage } from '@/i18n/i18n'
import { AppWorkspaceShell } from '@/app-shell/AppWorkspaceShell'
import { useAppChromeLayout } from '@/app-shell/chrome/use-app-chrome-layout'
import { useFloatingWorkspacePanel } from '../floating-terminal/workspace/use-floating-workspace-panel'
import { ConfirmationDialogProvider } from '../dismiss/confirmation/confirmation-dialog'
import { stubBots } from '../../component-fixtures/fixture-bots'
import { host } from './monitor-conversation.test-fixture'

function MonitorShell(): React.JSX.Element {
  const layout = useAppChromeLayout()
  const floatingWorkspace = useFloatingWorkspacePanel()
  return (
    <ConfirmationDialogProvider>
      <div className="flex h-[960px] flex-col">
        <AppWorkspaceShell layout={layout} floatingWorkspace={floatingWorkspace} />
      </div>
    </ConfirmationDialogProvider>
  )
}

function setupShell(): void {
  stubBots([])
  void setRendererUiLanguage('ko')
  const original = window.api.runtime.call
  window.api.runtime.call = async (request) =>
    request.method === 'orchestration.monitor'
      ? { id: 'fixture', ok: true, _meta: { runtimeId: 'fixture' }, result: host.snapshot! }
      : original(request)
}

export const shellConversations = defineFixture({
  width: 1200,
  setup: setupShell,
  store: {
    activeView: 'orchestration',
    sidebarOpen: true,
    rightSidebarOpen: true,
    sidebarWidth: 280,
    rightSidebarWidth: 360
  },
  render: () => <MonitorShell />,
  interact: async (frame) => {
    await new Promise<void>((resolve, reject) => {
      const ready = (): boolean =>
        [...frame.querySelectorAll('[role="tab"]')].some(
          (tab) => tab.textContent?.trim() === '대화'
        )
      const observer = new MutationObserver(() => {
        if (ready()) {
          observer.disconnect()
          clearTimeout(timer)
          resolve()
        }
      })
      const timer = setTimeout(() => {
        observer.disconnect()
        reject(new Error('Orchestration page did not load'))
      }, 10_000)
      observer.observe(frame, { childList: true, subtree: true })
      if (ready()) {
        observer.disconnect()
        clearTimeout(timer)
        resolve()
      }
    })
    const tab = [...frame.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (button) => button.textContent?.trim() === '대화'
    )!
    tab.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    )
    const conversation = frame.querySelectorAll<HTMLButtonElement>('nav button')[1]
    if (!conversation) {
      throw new Error('Conversation missing')
    }
    conversation.click()
  }
})

export const mediumShellConversations = defineFixture({ ...shellConversations, width: 960 })
export const narrowShellConversations = defineFixture({ ...shellConversations, width: 420 })
