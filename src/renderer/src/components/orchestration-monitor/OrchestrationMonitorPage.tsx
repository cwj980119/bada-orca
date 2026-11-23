import { useAppStore } from '@/store'
import { OrchestrationMonitorView } from './OrchestrationMonitorView'
import { useOrchestrationMonitor } from './use-orchestration-monitor'

export default function OrchestrationMonitorPage(): React.JSX.Element {
  const monitor = useOrchestrationMonitor()
  return (
    <OrchestrationMonitorView
      {...monitor}
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
