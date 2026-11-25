import {
  Circle,
  CircleAlert,
  CircleCheck,
  Clock3,
  Loader2,
  MessageCircle,
  Pause,
  ShieldCheck
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useTranslate } from '@/i18n/use-translate'
import type {
  MonitorExecutionState,
  MonitorRequestProgress
} from '../../../../shared/orchestration/orchestration-monitor'
import { executionLabel, progressLabel } from './monitor-operation-labels'

export function MonitorExecutionBadge({
  state
}: {
  state: MonitorExecutionState
}): React.JSX.Element {
  const t = useTranslate()
  const Icon = {
    idle: CircleCheck,
    starting: Loader2,
    working: Circle,
    approval: ShieldCheck,
    answer: MessageCircle,
    paused: Pause,
    failed: CircleAlert,
    sleeping: Clock3,
    unavailable: CircleAlert
  }[state]
  return (
    <Badge variant={['failed', 'approval', 'answer'].includes(state) ? 'warning' : 'outline'}>
      <Icon
        className={state === 'starting' ? 'animate-spin motion-reduce:animate-none' : undefined}
      />
      {executionLabel(t, state)}
    </Badge>
  )
}

export function MonitorProgressBadge({
  progress
}: {
  progress: MonitorRequestProgress
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <Badge variant={progress.attention ? 'warning' : 'secondary'}>
      {progressLabel(t, progress.stage)}
    </Badge>
  )
}
