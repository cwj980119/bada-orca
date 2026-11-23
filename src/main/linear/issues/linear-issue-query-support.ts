import type { LinearIssue } from '../../../shared/linear/issue-types'
import type { LinearWorkspaceSelection } from '../../../shared/linear/workspace-types'

import type { mapLinearIssue } from './linear-issue-mapping'
import type {
  LinearIssueConnectionLoader,
  LinearIssueListOptions,
  LinearIssueNode
} from './linear-issue-query-documents'
import type { LinearClientForWorkspace } from '../accounts/linear-account-client'
import type { LinearListFilter } from './linear-issue-listing'

export async function mapIssueForWorkspace(
  _entry: LinearClientForWorkspace,
  _issue: Parameters<typeof mapLinearIssue>[0],
  _options?: Parameters<typeof mapLinearIssue>[1]
): Promise<LinearIssue> {
  throw new Error('This service is not included in the internal edition.')
}

export function sortAndLimitIssues(_issues: LinearIssue[], _limit: number): LinearIssue[] {
  throw new Error('This service is not included in the internal edition.')
}

export function sortLimitAndDescribeIssues(
  _issues: LinearIssue[],
  _limit: number
): { items: LinearIssue[]; clipped: boolean } {
  throw new Error('This service is not included in the internal edition.')
}

export function mapRawIssueForWorkspace(
  _entry: LinearClientForWorkspace,
  _issue: LinearIssueNode
): LinearIssue {
  throw new Error('This service is not included in the internal edition.')
}

export function getOldestIssueTime(_issues: LinearIssue[]): number {
  throw new Error('This service is not included in the internal edition.')
}

export function getListIssueConnectionLoader(
  _entry: LinearClientForWorkspace,
  _filter: LinearListFilter,
  _options?: LinearIssueListOptions
): LinearIssueConnectionLoader {
  throw new Error('This service is not included in the internal edition.')
}

export function shouldThrowAuthError(
  _selection: LinearWorkspaceSelection | null | undefined
): boolean {
  throw new Error('This service is not included in the internal edition.')
}
