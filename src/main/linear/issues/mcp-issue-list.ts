import type {
  LinearMcpIssueListRequest,
  LinearMcpIssueListResult
} from '../../../shared/linear/mcp-issue-list'

export async function listMcpIssues(
  _request: LinearMcpIssueListRequest
): Promise<LinearMcpIssueListResult> {
  throw new Error('This service is not included in the internal edition.')
}
