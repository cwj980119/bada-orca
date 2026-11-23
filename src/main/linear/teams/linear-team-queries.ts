import type {
  LinearLabel,
  LinearMember,
  LinearTeam,
  LinearWorkflowState,
  LinearWorkspaceError,
  LinearWorkspaceSelection
} from '../../../shared/linear/workspace-types'

export async function listTeams(
  _workspaceId?: LinearWorkspaceSelection | null
): Promise<LinearTeam[]> {
  throw new Error('This service is not included in the internal edition.')
}

export async function listTeamsOrThrow(
  _workspaceId?: LinearWorkspaceSelection | null,
  _signal?: AbortSignal
): Promise<LinearTeam[]> {
  throw new Error('This service is not included in the internal edition.')
}

export async function listTeamsForAgent(
  _workspaceId?: LinearWorkspaceSelection | null
): Promise<{ teams: LinearTeam[]; errors: LinearWorkspaceError[] }> {
  throw new Error('This service is not included in the internal edition.')
}

export async function getTeamStates(
  _teamId: string,
  _workspaceId?: string | null
): Promise<LinearWorkflowState[]> {
  throw new Error('This service is not included in the internal edition.')
}

export async function getTeamStatesOrThrow(
  _teamId: string,
  _workspaceId?: string | null,
  _signal?: AbortSignal
): Promise<LinearWorkflowState[]> {
  throw new Error('This service is not included in the internal edition.')
}

export async function getTeamLabels(
  _teamId: string,
  _workspaceId?: string | null
): Promise<LinearLabel[]> {
  throw new Error('This service is not included in the internal edition.')
}

export async function getTeamLabelsOrThrow(
  _teamId: string,
  _workspaceId?: string | null,
  _signal?: AbortSignal
): Promise<LinearLabel[]> {
  throw new Error('This service is not included in the internal edition.')
}

export async function getTeamMembers(
  _teamId: string,
  _workspaceId?: string | null
): Promise<LinearMember[]> {
  throw new Error('This service is not included in the internal edition.')
}

export async function getTeamMembersOrThrow(
  _teamId: string,
  _workspaceId?: string | null,
  _signal?: AbortSignal
): Promise<LinearMember[]> {
  throw new Error('This service is not included in the internal edition.')
}

export async function getViewerForWorkspaceOrThrow(
  _workspaceId: string,
  _signal?: AbortSignal
): Promise<{ id: string; displayName?: string | null; avatarUrl?: string | null }> {
  throw new Error('This service is not included in the internal edition.')
}
