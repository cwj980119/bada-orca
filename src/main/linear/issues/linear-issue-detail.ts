import type { LinearIssue } from '../../../shared/linear/issue-types'
import type { LinearClientForWorkspace } from '../accounts/linear-account-client'

export async function readLinearIssueDetail(
  _entry: LinearClientForWorkspace,
  _id: string
): Promise<LinearIssue | null> {
  throw new Error('This service is not included in the internal edition.')
}
