import type { LinearIssue } from '../../../shared/linear/issue-types'
import type { LinearWorkspaceSelection } from '../../../shared/linear/workspace-types'

import type {
  LinearAttachmentWriteRecord,
  LinearCommentWriteRecord,
  LinearIssueWriteRecord
} from './linear-issue-write-support'

export async function getIssue(
  _id: string,
  _workspaceId?: LinearWorkspaceSelection | null
): Promise<LinearIssue | null> {
  throw new Error('This service is not included in the internal edition.')
}

export async function getIssueByUuidForAgent(
  _id: string,
  _workspaceId?: string | null,
  _signal?: AbortSignal
): Promise<LinearIssueWriteRecord | null> {
  throw new Error('This service is not included in the internal edition.')
}

export async function getCommentByUuidForAgent(
  _id: string,
  _workspaceId?: string | null,
  _signal?: AbortSignal
): Promise<LinearCommentWriteRecord | null> {
  throw new Error('This service is not included in the internal edition.')
}

export async function getAttachmentByUuidForAgent(
  _id: string,
  _workspaceId?: string | null,
  _signal?: AbortSignal
): Promise<LinearAttachmentWriteRecord | null> {
  throw new Error('This service is not included in the internal edition.')
}

export async function getIssueCommentThreadRoot(
  _issueId: string,
  _commentId: string,
  _workspaceId?: string | null,
  _signal?: AbortSignal
): Promise<{ id: string; parentId: string | null } | null> {
  throw new Error('This service is not included in the internal edition.')
}

export async function searchIssues(
  _query: string,
  _limit = 20,
  _workspaceId?: LinearWorkspaceSelection | null
): Promise<LinearIssue[]> {
  throw new Error('This service is not included in the internal edition.')
}
