import {
  OrchestrationMonitorParams,
  OrchestrationMonitorMessageParams,
  OrchestrationMonitorRecoverParams,
  type OrchestrationMonitorMessageDetail
} from '../../../../../shared/orchestration/orchestration-monitor'
import {
  createMonitorRead,
  readOrchestrationMonitor
} from '../../../orchestration/monitor/orchestration-monitor-read'
import { ownerOnly } from '../bots-caller-gates'
import { InvalidArgumentError } from '../../core'
import { defineOrchestrationMethod } from './access/orchestration-method-access'
import { recoverMonitorRequest } from '../../../orchestration/monitor/recover-monitor-request'
import { ORCHESTRATION_MONITOR_WORK_METHODS } from './monitor-work-methods'

export const ORCHESTRATION_MONITOR_METHODS = [
  ...ORCHESTRATION_MONITOR_WORK_METHODS,
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
  }),
  defineOrchestrationMethod({
    name: 'orchestration.monitorRecover',
    permission: 'workspace',
    params: OrchestrationMonitorRecoverParams,
    access: {
      kind: 'localOnly',
      targets: { id: 'message' },
      rule: ({ ctx }) =>
        ownerOnly(ctx, 'Recover bot requests from the orchestration monitor in Orca.')
    },
    handler: ({ id, action, operationId }, { runtime }) =>
      recoverMonitorRequest(runtime, id, action, operationId)
  })
]
