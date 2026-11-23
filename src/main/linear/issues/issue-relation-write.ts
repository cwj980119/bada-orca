import type {
  LinearIssueRelationship,
  LinearIssueRelationWriteResult
} from '../../../shared/linear/issue-relation-write'

export async function writeIssueRelation(_params: {
  issue: LinearIssueRelationWriteResult['issue']
  relatedIssue: LinearIssueRelationWriteResult['relatedIssue']
  relationship: LinearIssueRelationship
  operation: 'add' | 'remove'
  workspaceId: string
  signal?: AbortSignal
  beforeInvoke?: () => void
}): Promise<LinearIssueRelationWriteResult> {
  throw new Error('This service is not included in the internal edition.')
}
