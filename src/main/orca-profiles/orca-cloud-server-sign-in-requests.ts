import type { OrcaAccountMachinePlatform } from '../../shared/orca-account-server-sign-in'
import type { OrcaCloudAuthConfig } from './cloud-auth/profile-cloud-auth-config'

export type ServerSignInRequestBody = {
  clientId: string
  codeChallenge: string
  codeChallengeMethod: 'S256'
  state: string
  nonce: string
  scope: string
  machineLabel: string
  machinePlatform: OrcaAccountMachinePlatform
  localProfileId: string
}

export type ServerSignInMoveContext = {
  previousUserId?: string
  previousEmail?: string
  linkOwnerUserIds?: string[]
  linkedBotNames?: string[]
}

export type ServerSignInRequest = {
  requestId: string
  claimToken: string
  userCode: string
  verificationUrl: string
  intervalSeconds: number
  expiresInSeconds: number
}

export type ServerSignInPollResult =
  | { status: 'pending' | 'denied' | 'expired' }
  | { status: 'slow_down'; intervalSeconds?: number }
  | { status: 'approved'; code: string; redirectUri: string }

export class ServerSignInRequestRetryableError extends Error {}

export class ServerSignInRequestUnsupportedError extends Error {
  constructor() {
    super("Orca Cloud doesn't support server sign-in yet.")
  }
}

export async function startServerSignInRequest(
  _config: Pick<OrcaCloudAuthConfig, 'apiBaseUrl'>,
  _body: ServerSignInRequestBody,
  _signal: AbortSignal,
  _move?: ServerSignInMoveContext
): Promise<ServerSignInRequest> {
  throw new Error('This service is not included in the internal edition.')
}

export async function pollServerSignInRequest(
  _config: Pick<OrcaCloudAuthConfig, 'apiBaseUrl'>,
  _request: Pick<ServerSignInRequest, 'requestId' | 'claimToken'>,
  _signal: AbortSignal
): Promise<ServerSignInPollResult> {
  throw new Error('This service is not included in the internal edition.')
}

export async function closeServerSignInRequest(
  _config: Pick<OrcaCloudAuthConfig, 'apiBaseUrl'>,
  _request: Pick<ServerSignInRequest, 'requestId' | 'claimToken'>
): Promise<void> {
  throw new Error('This service is not included in the internal edition.')
}
