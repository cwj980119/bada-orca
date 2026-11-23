import type { LinearClient } from '@linear/sdk'

import type { LinearCredential } from './linear-token-store'

import type {
  LinearConnectionStatus,
  LinearViewer,
  LinearWorkspace,
  LinearWorkspaceSelection
} from '../../../shared/linear/workspace-types'

export type LinearClientForWorkspace = {
  workspace: LinearWorkspace
  client: LinearClient
  credential: LinearCredential
}

export const LINEAR_PUBLIC_FILE_URL_EXPIRY_SECONDS = 60 * 60

export function getClient(_workspaceId?: string | null): LinearClient | null {
  throw new Error('This service is not included in the internal edition.')
}

export function getClients(
  _workspaceId?: LinearWorkspaceSelection | null,
  _signal?: AbortSignal
): LinearClientForWorkspace[] {
  throw new Error('This service is not included in the internal edition.')
}

export function getPublicFileUrlClient(
  _entry: LinearClientForWorkspace,
  _signal?: AbortSignal
): LinearClient {
  throw new Error('This service is not included in the internal edition.')
}

export function isAuthError(_error: unknown): boolean {
  throw new Error('This service is not included in the internal edition.')
}

export async function connect(
  _apiKey: string
): Promise<
  { ok: true; viewer: LinearViewer; workspace: LinearWorkspace } | { ok: false; error: string }
> {
  throw new Error('This service is not included in the internal edition.')
}

export function disconnect(_workspaceId?: string): void {
  throw new Error('This service is not included in the internal edition.')
}

export function selectWorkspace(_workspaceId: LinearWorkspaceSelection): LinearConnectionStatus {
  throw new Error('This service is not included in the internal edition.')
}

export function getStatus(): LinearConnectionStatus {
  throw new Error('This service is not included in the internal edition.')
}

export async function testConnection(
  _workspaceId?: string
): Promise<
  { ok: true; viewer: LinearViewer; workspace: LinearWorkspace } | { ok: false; error: string }
> {
  throw new Error('This service is not included in the internal edition.')
}

export function initLinearToken(): void {
  throw new Error('This service is not included in the internal edition.')
}
