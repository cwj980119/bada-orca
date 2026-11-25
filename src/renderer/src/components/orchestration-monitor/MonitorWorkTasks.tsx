import { useState } from 'react'
import { Check, GitBranch } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import type {
  MonitorWorkDetail,
  MonitorWorkTask
} from '../../../../shared/orchestration/orchestration-work-monitor'
import type { MonitorHostSnapshot } from './monitor-host-snapshot'
import { monitorWorkLabel } from './monitor-work-labels'
import { MonitorWorkerOutput } from './MonitorWorkerOutput'
import { MonitorParticipantAvatar } from './MonitorParticipantAvatar'

function orderedTasks(tasks: MonitorWorkTask[]): MonitorWorkTask[] {
  const seen = new Set<string>()
  const ordered: MonitorWorkTask[] = []
  const visit = (roots: MonitorWorkTask[]) => {
    const stack = roots.toReversed()
    while (stack.length) {
      const task = stack.pop()!
      if (seen.has(task.id)) {
        continue
      }
      seen.add(task.id)
      ordered.push(task)
      stack.push(...tasks.filter((item) => item.parentId === task.id).toReversed())
    }
  }
  visit(tasks.filter((task) => !tasks.some((item) => item.id === task.parentId)))
  visit(tasks)
  return ordered
}

function taskDepth(task: MonitorWorkTask, tasks: MonitorWorkTask[]): number {
  const seen = new Set([task.id])
  let parent = task.parentId
  let depth = 0
  while (parent && !seen.has(parent) && depth < 4) {
    seen.add(parent)
    const next = tasks.find((item) => item.id === parent)
    if (!next) {
      break
    }
    depth++
    parent = next.parentId
  }
  return depth
}

export function MonitorWorkTasks({
  detail,
  host
}: {
  detail: MonitorWorkDetail
  host: MonitorHostSnapshot
}): React.JSX.Element {
  const t = useTranslate()
  const locale = useIntlLocale()
  const [selected, setSelected] = useState<string | null>(null)
  const task = detail.tasks.find((item) => item.id === selected) ?? detail.tasks[0]
  return (
    <section className="min-w-0 rounded-xl border bg-card text-card-foreground">
      <div className="border-b p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <GitBranch className="size-4 text-muted-foreground" />
          {t('orchestrationMonitor.work.taskTree', 'Tasks & dependencies')}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {t(
            'orchestrationMonitor.work.taskHint',
            'Follow each task from its assignment to the worker’s reported result.'
          )}
        </p>
      </div>
      {detail.tasksLimited || detail.attemptsLimited ? (
        <p className="px-4 pt-3 text-xs text-muted-foreground">
          {t(
            'orchestrationMonitor.work.detailLimited',
            'Showing up to 300 tasks and 600 recent attempts. Earlier records may be omitted.'
          )}
        </p>
      ) : null}
      {!task ? (
        <p className="p-5 text-sm text-muted-foreground">
          {t('orchestrationMonitor.work.noTasks', 'No tasks have been recorded for this work yet.')}
        </p>
      ) : (
        <>
          <div
            className="scrollbar-sleek max-h-80 space-y-1 overflow-auto border-b p-2"
            aria-label={t('orchestrationMonitor.work.taskTree', 'Tasks & dependencies')}
          >
            {orderedTasks(detail.tasks).map((item) => (
              <button
                type="button"
                key={item.id}
                aria-pressed={task.id === item.id}
                data-current={task.id === item.id}
                onClick={() => setSelected(item.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg py-3 pr-3 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  task.id === item.id && 'bg-accent',
                  ['pl-3', 'pl-6', 'pl-9', 'pl-12', 'pl-14'][taskDepth(item, detail.tasks)]
                )}
              >
                {item.status === 'completed' ? (
                  <Check className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <GitBranch className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0 flex-1 break-words">{item.title}</span>
                <Badge
                  variant={item.status === 'failed' ? 'warning' : 'outline'}
                  className="shrink-0"
                >
                  {monitorWorkLabel(t, item.status)}
                </Badge>
              </button>
            ))}
          </div>
          <div className="space-y-5 p-4" key={task.id}>
            <div>
              <h4 className="break-words text-sm font-semibold">{task.title}</h4>
              <p className="mt-1 break-all font-mono text-2xs text-muted-foreground">{task.id}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(task.createdAt).toLocaleString(locale)}
                {task.completedAt ? ` → ${new Date(task.completedAt).toLocaleString(locale)}` : ''}
              </p>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">
                {task.spec}
              </p>
              {task.specLimited ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t(
                    'orchestrationMonitor.work.specLimited',
                    'Task description shortened. Open the worker for the full request.'
                  )}
                </p>
              ) : null}
            </div>
            {task.dependencies.length ? (
              <div>
                <p className="mb-2 text-xs font-medium">
                  {t('orchestrationMonitor.work.dependsOn', 'Depends on')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {task.dependencies.map((id) => {
                    const dependency = detail.tasks.find((item) => item.id === id)
                    return (
                      <button
                        type="button"
                        key={id}
                        disabled={!dependency}
                        onClick={() => setSelected(id)}
                        className="rounded-md border px-2 py-1 text-left text-xs hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                      >
                        {dependency?.title ?? id}
                        {dependency ? ` · ${monitorWorkLabel(t, dependency.status)}` : ''}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}
            <div>
              <h4 className="mb-2 text-xs font-medium">
                {t('orchestrationMonitor.work.report', 'Reported result')}
              </h4>
              <div className="scrollbar-sleek max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3 text-sm leading-relaxed text-muted-foreground">
                {task.result ??
                  t(
                    'orchestrationMonitor.work.noReport',
                    'The worker has not reported a result yet.'
                  )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {task.resultLimited
                  ? t(
                      'orchestrationMonitor.work.reportLimited',
                      'Report shortened. Open the worker for the full context.'
                    )
                  : t(
                      'orchestrationMonitor.work.reportNote',
                      'Results, changed files, and test outcomes are shown as reported by the worker.'
                    )}
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-medium">
                {t('orchestrationMonitor.work.attempts', 'Worker attempts')}
              </h4>
              {task.attempts.map((attempt) => (
                <article key={attempt.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <MonitorParticipantAvatar
                        participant={
                          attempt.participant
                            ? {
                                ...attempt.participant,
                                host,
                                execution: attempt.participant.execution
                              }
                            : undefined
                        }
                      />
                      <span className="break-all text-xs font-medium">
                        {attempt.participant?.name ?? attempt.assignee ?? attempt.id}
                      </span>
                    </div>
                    <Badge variant="outline">
                      {monitorWorkLabel(t, attempt.workerState ?? attempt.status)}
                    </Badge>
                  </div>
                  <p className="mt-2 break-words text-xs text-muted-foreground">
                    {attempt.host ?? host.label} ·{' '}
                    {new Date(attempt.startedAt).toLocaleString(locale)}
                  </p>
                  {attempt.error ? (
                    <p className="mt-2 break-words text-xs text-destructive">{attempt.error}</p>
                  ) : null}
                  <MonitorWorkerOutput dispatchId={attempt.id} label={task.title} host={host} />
                </article>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
