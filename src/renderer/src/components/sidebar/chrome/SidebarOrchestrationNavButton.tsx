import { Network } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { useAppStore } from '@/store'
import { cn } from '@/lib/class-names'

export function SidebarOrchestrationNavButton(): React.JSX.Element {
  const t = useTranslate()
  const active = useAppStore((state) => state.activeView === 'orchestration')
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium transition-colors',
        active
          ? 'bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground'
          : 'text-worktree-sidebar-foreground/60 hover:bg-worktree-sidebar-accent'
      )}
      onClick={() => {
        const state = useAppStore.getState()
        state.recordViewVisit('orchestration')
        state.setActiveView('orchestration')
      }}
    >
      <Network className="size-4 shrink-0" />
      <span>{t('orchestrationMonitor.title', 'Orchestration')}</span>
    </button>
  )
}
