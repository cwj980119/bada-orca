import type { LinearComment } from '../../../shared/linear/issue-types'

import type {
  LinearAttachmentWriteRecord,
  LinearCommentWriteRecord
} from './linear-issue-write-support'

export async function addIssueComment(
  _issueId: string,
  _body: string,
  _workspaceId?: string | null,
  _options?: { id?: string; parentId?: string | null }
): Promise<
  | { ok: true; id: string; url?: string | null; parentId?: string | null }
  | { ok: false; error: string }
> {
  throw new Error('This service is not included in the internal edition.')
}

export async function addIssueCommentForAgent(
  _issueId: string,
  _body: string,
  _workspaceId: string,
  _options: {
    id: string
    parentId?: string | null
    signal?: AbortSignal
    beforeInvoke?: () => void
  }
): Promise<LinearCommentWriteRecord> {
  throw new Error('This service is not included in the internal edition.')
}

export async function updateIssueCommentForAgent(
  _commentId: string,
  _body: string,
  _workspaceId: string,
  _options: { signal?: AbortSignal; beforeInvoke?: () => void } = {}
): Promise<LinearCommentWriteRecord> {
  throw new Error('This service is not included in the internal edition.')
}

export async function deleteIssueCommentForAgent(
  _commentId: string,
  _workspaceId: string,
  _options: { signal?: AbortSignal; beforeInvoke?: () => void } = {}
): Promise<void> {
  throw new Error('This service is not included in the internal edition.')
}

export async function createIssueAttachment(
  _issueId: string,
  _input: { id: string; title: string; url: string },
  _workspaceId: string,
  _options: { signal?: AbortSignal; beforeInvoke?: () => void } = {}
): Promise<LinearAttachmentWriteRecord> {
  throw new Error('This service is not included in the internal edition.')
}

export async function getIssueComments(
  _issueId: string,
  _workspaceId?: string | null
): Promise<LinearComment[]> {
  throw new Error('This service is not included in the internal edition.')
}
