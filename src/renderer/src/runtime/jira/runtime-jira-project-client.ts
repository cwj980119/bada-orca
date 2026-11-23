import type {
  JiraConnectionStatus,
  JiraProject,
  JiraSiteSelection
} from '../../../../shared/jira/jira-types'

import type { RuntimeClientTarget } from '../../../../shared/remote-runtime/host-catalog/runtime-client-target'
import { callRuntimeRpc } from '../rpc/calls/runtime-rpc-call'

export async function jiraStatusForTarget(
  _target: RuntimeClientTarget
): Promise<JiraConnectionStatus> {
  {
    return { connected: false, viewer: null, sites: [] }
  }
}
export async function jiraListProjectsForTarget(
  target: RuntimeClientTarget,
  siteId?: JiraSiteSelection | null
): Promise<JiraProject[]> {
  return target.kind === 'environment'
    ? callRuntimeRpc<JiraProject[]>(target, 'jira.listProjects', siteId ? { siteId } : undefined, {
        timeoutMs: 30000
      })
    : window.api.jira.listProjects(siteId ? { siteId } : undefined)
}
