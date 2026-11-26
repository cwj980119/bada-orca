import { useAppStore } from '@/store'
import { useBots } from '@/lib/bot-catalog'
import { useBotGroups } from '@/lib/bot-group-list'
import { OrchestrationMonitorView } from './OrchestrationMonitorView'
import { useOrchestrationMonitor } from './use-orchestration-monitor'

export default function OrchestrationMonitorPage(): React.JSX.Element {
  const monitor = useOrchestrationMonitor()
  const bots = useBots()
  const groups = useBotGroups()
  return (
    <OrchestrationMonitorView
      {...monitor}
      bots={bots}
      groups={groups}
      onRefresh={monitor.refresh}
      onBack={() => {
        const state = useAppStore.getState()
        if (state.worktreeNavHistoryIndex > 0) {
          state.goBackWorktree()
        } else {
          state.setActiveView('terminal')
        }
      }}
      onConfigure={() => {
        const state = useAppStore.getState()
        state.openSettingsTarget({ pane: 'intranet', repoId: null })
        state.openSettingsPage()
      }}
    />
  )
}
