import type { LinearIssueUpdate } from '../../../shared/work-items/issue-mutation-types'

import type { LinearIssueWriteRecord } from './linear-issue-write-support'

export async function createIssue(
  _teamId: string,
  _title: string,
  _description?: string,
  _workspaceId?: string | null,
  _options?: {
    id?: string
    parentId?: string
    projectId?: string | null
    stateId?: string
    priority?: number
    estimate?: number | null
    dueDate?: string | null
    assigneeId?: string | null
    labelIds?: string[]
  }
): Promise<
  | { ok: true; id: string; identifier: string; title: string; url: string }
  | { ok: false; error: string }
> {
  throw new Error('This service is not included in the internal edition.')
}

export async function createIssueForAgent(
  _teamId: string,
  _title: string,
  _description: string | undefined,
  _workspaceId: string,
  _options: {
    id: string
    parentId?: string | null
    projectId?: string | null
    stateId?: string
    assigneeId?: string | null
    priority?: number
    estimate?: number | null
    dueDate?: string | null
    labelIds?: string[]
    signal?: AbortSignal
    beforeInvoke?: () => void
  }
): Promise<LinearIssueWriteRecord> {
  throw new Error('This service is not included in the internal edition.')
}

export async function updateIssue(
  _id: string,
  _updates: LinearIssueUpdate,
  _workspaceId?: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  throw new Error('This service is not included in the internal edition.')
}

export async function updateIssueForAgent(
  _id: string,
  _updates: LinearIssueUpdate,
  _workspaceId: string,
  _options: { signal?: AbortSignal; beforeInvoke?: () => void } = {}
): Promise<LinearIssueWriteRecord> {
  throw new Error('This service is not included in the internal edition.')
}
