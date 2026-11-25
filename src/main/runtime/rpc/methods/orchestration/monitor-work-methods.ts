import {
  MonitorWorksParams,
  MonitorWorkParams,
  MonitorWorkLimitsParams
} from '../../../../../shared/orchestration/orchestration-work-monitor'
import {
  readRuntimeMonitorWork,
  readMonitorWorks
} from '../../../orchestration/monitor/monitor-work-read'
import { updateRunControls } from '../../../orchestration/db/runs/run-controls'
import { stopMonitorWork } from '../../../orchestration/monitor/stop-monitor-work'
import { defineOrchestrationMethod } from './access/orchestration-method-access'
import { ownerOnly } from '../bots-caller-gates'
import type { RpcContext } from '../../core'

const owner = ({ ctx }: { ctx: RpcContext }) =>
  ownerOnly(ctx, 'Manage work from the orchestration monitor in Orca.')

export const ORCHESTRATION_MONITOR_WORK_METHODS = [
  defineOrchestrationMethod({
    name: 'orchestration.monitorWorks',
    permission: 'workspace',
    params: MonitorWorksParams,
    access: { kind: 'localOnly', targets: {}, rule: owner },
    handler: (_params, { runtime }) => readMonitorWorks(runtime.getOrchestrationDb())
  }),
  defineOrchestrationMethod({
    name: 'orchestration.monitorWork',
    permission: 'workspace',
    params: MonitorWorkParams,
    access: { kind: 'localOnly', targets: { runId: 'run' }, rule: owner },
    handler: ({ runId }, { runtime }) => readRuntimeMonitorWork(runtime, runId)
  }),
  defineOrchestrationMethod({
    name: 'orchestration.monitorWorkLimits',
    permission: 'workspace',
    params: MonitorWorkLimitsParams,
    access: { kind: 'localOnly', targets: { runId: 'run' }, rule: owner },
    handler: (params, { runtime }) => updateRunControls(runtime.getOrchestrationDb(), params)
  }),
  defineOrchestrationMethod({
    name: 'orchestration.monitorWorkStop',
    permission: 'workspace',
    params: MonitorWorkParams,
    access: { kind: 'localOnly', targets: { runId: 'run' }, rule: owner },
    handler: ({ runId }, { runtime }) => stopMonitorWork(runtime, runId)
  })
]
