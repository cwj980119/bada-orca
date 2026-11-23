import type { OrcaOrgMembersRoster, OrcaOrgRole } from '../../../shared/orca-profiles/orca-profiles'
import type { OrcaCloudAuthConfig } from '../cloud-auth/profile-cloud-auth-config'
import type { OrcaCloudSession } from '../cloud-session/profile-cloud-session-store'

export async function listOrcaCloudOrgMembers(
  _config: OrcaCloudAuthConfig,
  _session: OrcaCloudSession,
  _orgId: string
): Promise<OrcaOrgMembersRoster> {
  throw new Error('This service is not included in the internal edition.')
}

export async function inviteOrcaCloudOrgMember(
  _config: OrcaCloudAuthConfig,
  _session: OrcaCloudSession,
  _args: { orgId: string; email: string; role: OrcaOrgRole }
): Promise<void> {
  throw new Error('This service is not included in the internal edition.')
}

export async function revokeOrcaCloudOrgInvite(
  _config: OrcaCloudAuthConfig,
  _session: OrcaCloudSession,
  _args: { orgId: string; email: string }
): Promise<void> {
  throw new Error('This service is not included in the internal edition.')
}

export async function changeOrcaCloudOrgMemberRole(
  _config: OrcaCloudAuthConfig,
  _session: OrcaCloudSession,
  _args: { orgId: string; userId: string; role: OrcaOrgRole }
): Promise<void> {
  throw new Error('This service is not included in the internal edition.')
}

export async function removeOrcaCloudOrgMember(
  _config: OrcaCloudAuthConfig,
  _session: OrcaCloudSession,
  _args: { orgId: string; userId: string }
): Promise<void> {
  throw new Error('This service is not included in the internal edition.')
}
