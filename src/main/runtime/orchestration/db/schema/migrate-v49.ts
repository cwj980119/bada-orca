import type { OrchestrationDb } from '../orchestration-db'
import { RUN_CONTROL_SCHEMA_SQL } from '../runs/run-control-schema'

export function migrateV49(this: OrchestrationDb, current: number): void {
  if (current < 49) {
    this.db.exec(RUN_CONTROL_SCHEMA_SQL)
  }
}
