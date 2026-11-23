import type { LinearIssue } from '../../../shared/linear/issue-types'
import type {
  LinearCollectionResult,
  LinearConcreteWorkspaceId
} from '../../../shared/linear/workspace-types'

import type { LinearClientForWorkspace } from '../accounts/linear-account-client'

import type { LinearConnection, LinearIssueNode } from '../collections/linear-collection-nodes'

export async function readIssueConnectionPages(
  _entry: LinearClientForWorkspace,
  _limit: number,
  _loadConnection: (variables: {
    first: number
    after?: string
  }) => Promise<LinearConnection<LinearIssueNode> | null | undefined>
): Promise<LinearCollectionResult<LinearIssue>> {
  throw new Error('This service is not included in the internal edition.')
}

export async function listProjectIssues(
  _projectId: string,
  _limit = 20,
  _workspaceId: LinearConcreteWorkspaceId,
  _force = false
): Promise<LinearCollectionResult<LinearIssue>> {
  throw new Error('This service is not included in the internal edition.')
}
