import type { LinearClient } from '@linear/sdk'
import type { RawRelationNode } from './context/issue-context-graphql'

export async function createLinearIssueRelation(
  _client: LinearClient,
  _input: { issueId: string; relatedIssueId: string; type: string }
): Promise<RawRelationNode> {
  throw new Error('This service is not included in the internal edition.')
}

export async function deleteLinearIssueRelation(
  _client: LinearClient,
  _relationId: string
): Promise<void> {
  throw new Error('This service is not included in the internal edition.')
}
