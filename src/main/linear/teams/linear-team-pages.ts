import type {
  LinearLabel,
  LinearMember,
  LinearTeam,
  LinearWorkflowState
} from '../../../shared/linear/workspace-types'

import type { LinearClientForWorkspace } from '../accounts/linear-account-client'

type LinearConnectionPage<TNode> = {
  nodes: TNode[]
  pageInfo: { hasNextPage: boolean }
  fetchNext: () => Promise<LinearConnectionPage<TNode>>
}

type TeamLabelNode = {
  id: string
  name: string
  color: string
  isGroup: boolean
}

type TeamMemberNode = {
  id: string
  displayName: string
  name?: string | null
  email?: string | null
  avatarUrl?: string | null
}

type TeamStateNode = {
  id: string
  name: string
  type: string
  color: string
  position: number
}

export async function fetchAllTeamsForWorkspace(
  _entry: LinearClientForWorkspace,
  _signal?: AbortSignal
): Promise<LinearTeam[]> {
  throw new Error('This service is not included in the internal edition.')
}

export async function fetchAllTeamStates(
  _team: {
    states: (variables?: { first?: number }) => Promise<LinearConnectionPage<TeamStateNode>>
  },
  _signal?: AbortSignal
): Promise<LinearWorkflowState[]> {
  throw new Error('This service is not included in the internal edition.')
}

export async function fetchAllTeamLabels(
  _team: {
    labels: (variables?: { first?: number }) => Promise<LinearConnectionPage<TeamLabelNode>>
  },
  _signal?: AbortSignal
): Promise<LinearLabel[]> {
  throw new Error('This service is not included in the internal edition.')
}

export async function fetchAllTeamMembers(
  _team: {
    members: (variables?: { first?: number }) => Promise<LinearConnectionPage<TeamMemberNode>>
  },
  _signal?: AbortSignal
): Promise<LinearMember[]> {
  throw new Error('This service is not included in the internal edition.')
}
