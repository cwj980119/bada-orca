import {
  defaultHostOAuthRefreshDeps,
  type HostOAuthRefreshDeps
} from '../../host-oauth/host-oauth-refresh'

import type { LinearLogin } from './linear-login-store'

export async function refreshLinearLogin(
  _workspaceId: string,
  _deps: HostOAuthRefreshDeps = defaultHostOAuthRefreshDeps,
  _force = false
): Promise<void> {
  throw new Error('This service is not included in the internal edition.')
}

export async function refreshDueLinearLogins(
  _deps: HostOAuthRefreshDeps = defaultHostOAuthRefreshDeps
): Promise<void> {
  throw new Error('This service is not included in the internal edition.')
}

export function refreshLinearLoginIfDue(_workspaceId: string, _login: LinearLogin): void {
  throw new Error('This service is not included in the internal edition.')
}
