import type { LinearIssue } from '../../../shared/linear/issue-types'
import type {
  LinearCustomViewModel,
  LinearCustomViewSummary,
  LinearProjectSummary
} from '../../../shared/linear/project-types'
import type {
  LinearCollectionResult,
  LinearConcreteWorkspaceId,
  LinearWorkspaceSelection
} from '../../../shared/linear/workspace-types'

export async function listCustomViews(
  _model: LinearCustomViewModel,
  _limit = 20,
  _workspaceId?: LinearWorkspaceSelection | null,
  _force = false
): Promise<LinearCollectionResult<LinearCustomViewSummary>> {
  throw new Error('This service is not included in the internal edition.')
}

export async function getCustomView(
  _viewId: string,
  _model: LinearCustomViewModel,
  _workspaceId: LinearConcreteWorkspaceId,
  _force = false
): Promise<LinearCustomViewSummary | null> {
  throw new Error('This service is not included in the internal edition.')
}

export async function listCustomViewIssues(
  _viewId: string,
  _limit = 20,
  _workspaceId: LinearConcreteWorkspaceId,
  _force = false
): Promise<LinearCollectionResult<LinearIssue>> {
  throw new Error('This service is not included in the internal edition.')
}

export async function listCustomViewProjects(
  _viewId: string,
  _limit = 20,
  _workspaceId: LinearConcreteWorkspaceId,
  _force = false
): Promise<LinearCollectionResult<LinearProjectSummary>> {
  throw new Error('This service is not included in the internal edition.')
}
