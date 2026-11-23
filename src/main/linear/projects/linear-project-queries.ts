import type {
  LinearProjectDetail,
  LinearProjectSummary
} from '../../../shared/linear/project-types'
import type {
  LinearCollectionResult,
  LinearConcreteWorkspaceId,
  LinearWorkspaceSelection
} from '../../../shared/linear/workspace-types'

import type { LinearProjectCreateInput } from '../collections/linear-collection-nodes'

export async function listProjects(
  _query: string | undefined,
  _limit: number | null = 20,
  _workspaceId?: LinearWorkspaceSelection | null,
  _force = false,
  _options4: { signal?: AbortSignal; summaryOnly?: boolean } = {}
): Promise<LinearCollectionResult<LinearProjectSummary>> {
  throw new Error('This service is not included in the internal edition.')
}

export async function listProjectsByExactName(
  _name: string,
  _workspaceId: LinearConcreteWorkspaceId,
  _force = false,
  _signal?: AbortSignal
): Promise<LinearProjectSummary[]> {
  throw new Error('This service is not included in the internal edition.')
}

export async function getProject(
  _id: string,
  _workspaceId: LinearConcreteWorkspaceId,
  _force = false,
  _signal?: AbortSignal
): Promise<LinearProjectDetail | null> {
  throw new Error('This service is not included in the internal edition.')
}

export async function createProject(
  _input: LinearProjectCreateInput,
  _workspaceId?: string | null
): Promise<{ ok: true; project: LinearProjectDetail } | { ok: false; error: string }> {
  throw new Error('This service is not included in the internal edition.')
}
