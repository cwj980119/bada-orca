import {
  OrchestrationMonitorParams,
  OrchestrationMonitorMessageParams,
  type OrchestrationMonitorMessageDetail
} from '../../../../../shared/orchestration/orchestration-monitor'
import {
  createMonitorRead,
  readOrchestrationMonitor
} from '../../../orchestration/monitor/orchestration-monitor-read'
import { ownerOnly } from '../bots-caller-gates'
import { InvalidArgumentError } from '../../core'
import { defineOrchestrationMethod } from './access/orchestration-method-access'

export const ORCHESTRATION_MONITOR_METHODS = [
  defineOrchestrationMethod({
    name: 'orchestration.monitor',
    permission: 'workspace',
    params: OrchestrationMonitorParams,
    access: {
      kind: 'localOnly',
      targets: {},
      rule: ({ ctx }) => ownerOnly(ctx, 'Open the orchestration monitor in Orca.')
    },
    handler: (_params, { runtime }) => readOrchestrationMonitor(runtime)
  }),
  defineOrchestrationMethod({
    name: 'orchestration.monitorMessage',
    permission: 'workspace',
    params: OrchestrationMonitorMessageParams,
    access: {
      kind: 'localOnly',
      targets: { id: 'message' },
      rule: ({ ctx }) => ownerOnly(ctx, 'Open the orchestration monitor in Orca.')
    },
    handler: ({ id }, { runtime }): OrchestrationMonitorMessageDetail => {
      const read = createMonitorRead(runtime)
      const row = read.db.getMessageById(id)
      if (!row) {
        throw new InvalidArgumentError('Message no longer exists.')
      }
      return { message: read.message(row), body: row.body, payload: row.payload }
    }
  })
]
