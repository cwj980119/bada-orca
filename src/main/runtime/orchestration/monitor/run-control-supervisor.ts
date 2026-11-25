import type { OrchestrationDb } from '../db/orchestration-db'

export class RunControlSupervisor {
  private timer: ReturnType<typeof setTimeout> | undefined
  private closed = false
  private checking = false

  constructor(
    private readonly db: OrchestrationDb,
    private readonly stopRun: (runId: string, reason: 'user' | 'deadline') => Promise<unknown>
  ) {}

  start(): void {
    this.db.runControlChanged = () => this.rearm()
    this.db.runControlClosed = () => this.close()
    this.rearm()
  }

  close(): void {
    this.closed = true
    clearTimeout(this.timer)
  }

  private rearm(): void {
    clearTimeout(this.timer)
    if (this.closed || this.checking) {
      return
    }
    const row = this.db.db
      .prepare(`SELECT MIN(julianday(deadline_at)) AS deadline
      FROM orchestration_run_controls WHERE stopped_at IS NULL AND deadline_at IS NOT NULL`)
      .get()
    const pending = this.db.db
      .prepare(`SELECT 1 FROM orchestration_run_controls c
      JOIN dispatch_contexts d ON d.run_id = c.run_id
      LEFT JOIN worker_dispatches w ON w.dispatch_id = d.id WHERE c.stopped_at IS NOT NULL
      AND (w.state IN ('starting', 'ready', 'start_unknown', 'stopping', 'stop_unknown')
        OR (w.dispatch_id IS NULL AND d.status IN ('pending', 'dispatched'))) LIMIT 1`)
      .get()
    if (row?.deadline == null && !pending) {
      return
    }
    const deadlineMs =
      row?.deadline == null ? Infinity : (Number(row.deadline) - 2440587.5) * 86400000
    const delay = Math.min(
      2_147_483_647,
      pending ? 30_000 : Infinity,
      Math.max(0, deadlineMs - Date.now())
    )
    this.timer = setTimeout(() => {
      void this.reconcile().catch((error: unknown) => {
        console.warn('[orchestration] Run control reconciliation failed', error)
      })
    }, delay)
    this.timer.unref?.()
  }

  async reconcile(): Promise<void> {
    if (this.closed || this.checking) {
      return
    }
    this.checking = true
    try {
      // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: These columns are TEXT and nullable TEXT in the run-controls schema.
      const due = this.db.db
        .prepare(`SELECT run_id, stopped_at FROM orchestration_run_controls c
        WHERE (stopped_at IS NULL AND julianday(deadline_at) <= julianday('now'))
        OR (stopped_at IS NOT NULL AND EXISTS (SELECT 1 FROM dispatch_contexts d
          LEFT JOIN worker_dispatches w ON w.dispatch_id = d.id WHERE d.run_id = c.run_id
          AND (w.state IN ('starting', 'ready', 'start_unknown', 'stopping', 'stop_unknown')
            OR (w.dispatch_id IS NULL AND d.status IN ('pending', 'dispatched')))))
        ORDER BY (stopped_at IS NULL) DESC, updated_at, run_id LIMIT 32`)
        .all() as { run_id: string; stopped_at: string | null }[]
      for (const row of due) {
        if (this.closed) {
          break
        }
        try {
          await this.stopRun(row.run_id, row.stopped_at ? 'user' : 'deadline')
        } catch (error) {
          console.warn('[orchestration] Run stop remains unconfirmed', row.run_id, error)
        }
      }
    } finally {
      this.checking = false
      this.rearm()
    }
  }
}
