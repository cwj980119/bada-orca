import type {
  OrcaCloudCapabilities,
  OrcaCloudOrgSummary,
  OrcaProfileCloudSummary
} from '../../../shared/orca-profiles/orca-profiles'
import type { OrcaCloudAuthConfig } from './profile-cloud-auth-config'
import type { OrcaCloudSession } from '../cloud-session/profile-cloud-session-store'
import type { OrcaCloudSessionExchangeResponse } from '../cloud-session/profile-cloud-session-exchange'

type ExchangeCodeArgs = {
  code: string
  codeVerifier: string
  nonce: string
  redirectUri: string
  state: string
  localProfileId: string
}

type CreateCloudProfileArgs = {
  orgId?: string
  name?: string
}

type SelectOrgResponse = {
  cloud: OrcaProfileCloudSummary
  organizations?: OrcaCloudOrgSummary[]
  capabilities: OrcaCloudCapabilities
}

type CapabilityRefreshResponse = {
  cloud?: OrcaProfileCloudSummary
  organizations?: OrcaCloudOrgSummary[]
  capabilities: OrcaCloudCapabilities
}

export class OrcaCloudRequestError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode?: string
  ) {
    super(`orca_cloud_request_failed_${statusCode}`)
    this.name = 'OrcaCloudRequestError'
  }
}

// Without an explicit rejection, a rotating credential may already be spent.
export function isAmbiguousCloudRequestFailure(_error: unknown): boolean {
  throw new Error('This service is not included in the internal edition.')
}

// Proxies, CDNs and gateways answer with HTML; only the auth server's JSON carries a verdict.

export async function exchangeOrcaCloudAuthCode(
  _config: OrcaCloudAuthConfig,
  _args: ExchangeCodeArgs
): Promise<OrcaCloudSessionExchangeResponse> {
  throw new Error('This service is not included in the internal edition.')
}

export async function refreshOrcaCloudCapabilities(
  _config: OrcaCloudAuthConfig,
  _session: OrcaCloudSession
): Promise<CapabilityRefreshResponse> {
  throw new Error('This service is not included in the internal edition.')
}

export async function refreshOrcaCloudSession(
  _config: OrcaCloudAuthConfig,
  _session: OrcaCloudSession
): Promise<OrcaCloudSessionExchangeResponse> {
  throw new Error('This service is not included in the internal edition.')
}

export async function createOrcaCloudProfile(
  _config: OrcaCloudAuthConfig,
  _session: OrcaCloudSession,
  _args: CreateCloudProfileArgs
): Promise<OrcaCloudSessionExchangeResponse> {
  throw new Error('This service is not included in the internal edition.')
}

export async function selectOrcaCloudOrg(
  _config: OrcaCloudAuthConfig,
  _session: OrcaCloudSession,
  _orgId: string
): Promise<SelectOrgResponse> {
  throw new Error('This service is not included in the internal edition.')
}

export async function revokeOrcaCloudSession(
  _config: OrcaCloudAuthConfig,
  _session: OrcaCloudSession
): Promise<void> {
  throw new Error('This service is not included in the internal edition.')
}
