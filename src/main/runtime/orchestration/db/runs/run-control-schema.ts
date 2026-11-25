export const RUN_CONTROL_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS orchestration_run_controls (
  run_id TEXT PRIMARY KEY,
  revision INTEGER NOT NULL DEFAULT 0,
  max_active_workers INTEGER,
  max_bot_requests INTEGER,
  deadline_at TEXT,
  stopped_at TEXT,
  stop_reason TEXT CHECK(stop_reason IN ('user', 'deadline')),
  stop_report TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_run_controls_deadline ON orchestration_run_controls(deadline_at)
  WHERE stopped_at IS NULL AND deadline_at IS NOT NULL;
`

const closed = `(c.stopped_at IS NOT NULL OR julianday(c.deadline_at) <= julianday('now'))`

export const DROP_RUN_CONTROL_GUARDS_SQL = `
  DROP TRIGGER IF EXISTS trg_run_controls_delete;
  DROP TRIGGER IF EXISTS trg_run_worker_admission;
  DROP TRIGGER IF EXISTS trg_run_worker_readmission;
  DROP TRIGGER IF EXISTS trg_run_bot_request_admission;
  DROP TRIGGER IF EXISTS trg_run_reserved_mail_admission;
`

export const RUN_CONTROL_GUARDS_SQL = `
    CREATE TRIGGER IF NOT EXISTS trg_run_controls_delete AFTER DELETE ON runs BEGIN
      DELETE FROM orchestration_run_controls WHERE run_id = OLD.id;
    END;
    CREATE TRIGGER IF NOT EXISTS trg_run_worker_admission BEFORE INSERT ON dispatch_contexts
      WHEN NEW.status IN ('pending', 'dispatched') AND NEW.capability_revoked_at IS NULL BEGIN
      ${workerGuard()}
    END;
    CREATE TRIGGER IF NOT EXISTS trg_run_worker_readmission
      BEFORE UPDATE OF status, run_id, capability_revoked_at ON dispatch_contexts
      WHEN NEW.status IN ('pending', 'dispatched') AND NEW.capability_revoked_at IS NULL
        AND (OLD.status NOT IN ('pending', 'dispatched') OR OLD.capability_revoked_at IS NOT NULL
          OR OLD.run_id IS NOT NEW.run_id) BEGIN
      ${workerGuard()}
    END;
    CREATE TRIGGER IF NOT EXISTS trg_run_bot_request_admission BEFORE INSERT ON bot_requests BEGIN
      ${requestGuard('(SELECT run_id FROM messages WHERE id = NEW.message_id)')}
    END;
    CREATE TRIGGER IF NOT EXISTS trg_run_reserved_mail_admission BEFORE INSERT ON messages
      WHEN EXISTS (SELECT 1 FROM bot_requests WHERE message_id = NEW.id) BEGIN
      ${requestGuard('NEW.run_id')}
    END;
  `

function workerGuard(): string {
  return `
    SELECT RAISE(ABORT, 'Run is stopped or its execution deadline has passed.')
      FROM orchestration_run_controls c WHERE c.run_id = NEW.run_id AND ${closed};
    SELECT RAISE(ABORT, 'Run concurrent worker limit reached.')
      FROM orchestration_run_controls c WHERE c.run_id = NEW.run_id
      AND c.max_active_workers IS NOT NULL AND
      (SELECT COUNT(*) FROM dispatch_contexts d LEFT JOIN worker_dispatches w ON w.dispatch_id = d.id
        WHERE d.run_id = NEW.run_id AND d.id != NEW.id AND
        (w.state IN ('starting', 'ready', 'start_unknown', 'stopping', 'stop_unknown') OR
          (w.dispatch_id IS NULL AND d.status IN ('pending', 'dispatched')
            AND d.capability_revoked_at IS NULL))) >= c.max_active_workers;
  `
}

function requestGuard(run: string): string {
  return `
    SELECT RAISE(ABORT, 'Run is stopped or its execution deadline has passed.')
      FROM orchestration_run_controls c WHERE c.run_id = ${run} AND ${closed};
    SELECT RAISE(ABORT, 'Run bot request limit reached.')
      FROM orchestration_run_controls c WHERE c.run_id = ${run} AND c.max_bot_requests IS NOT NULL
      AND (SELECT COUNT(*) FROM bot_requests b JOIN messages m ON m.id = b.message_id
        WHERE m.run_id = c.run_id) >= c.max_bot_requests;
  `
}
