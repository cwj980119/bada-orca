import type { LinearProjectSummary } from '../../../shared/linear/project-types'
import type { LinearConcreteWorkspaceId } from '../../../shared/linear/workspace-types'

export async function listProjectTeams(
  _projectId: string,
  _workspaceId: LinearConcreteWorkspaceId,
  _force = false,
  _signal?: AbortSignal
): Promise<NonNullable<LinearProjectSummary['teams']>> {
  throw new Error('This service is not included in the internal edition.')
}
