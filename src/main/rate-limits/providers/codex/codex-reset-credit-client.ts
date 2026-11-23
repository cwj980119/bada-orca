import type {
  CodexRateLimitResetOutcome,
  ProviderRateLimits
} from '../../../../shared/agent-usage/rate-limits/rate-limit-types'

import type { CodexBackendRequest } from './codex-backend-auth'
import type { CodexRateLimitFetchOptions } from './codex-rate-limit-fetch-options'

export type RateLimitResetCredits = {
  availableCount: number
  totalEarnedCount?: number
  nextExpiresAt?: number | null
  credits?: {
    status: string
    expiresAt: number | null
    grantedAt: number | null
  }[]
}

export type RpcRateLimitResetCredits = {
  availableCount?: number
  totalEarnedCount?: number
  nextExpiresAt?: number | null
  credits?: {
    status?: string
    expiresAt?: number | string | null
    grantedAt?: number | string | null
  }[]
} | null

type BackendRateLimitResetCreditsResponse = {
  available_count?: number
  total_earned_count?: number
  credits?: {
    status?: string
    expires_at?: string | null
    granted_at?: string | null
  }[]
}

export function mapRpcRateLimitResetCredits(
  _raw: RpcRateLimitResetCredits | undefined
): RateLimitResetCredits | null | undefined {
  throw new Error('This service is not included in the internal edition.')
}

export function mapBackendRateLimitResetCredits(
  _raw: BackendRateLimitResetCreditsResponse | null | undefined
): RateLimitResetCredits | null | undefined {
  throw new Error('This service is not included in the internal edition.')
}

export async function supplementCodexRateLimitResetCredits(
  _limits: ProviderRateLimits,
  _request: CodexBackendRequest,
  _options?: CodexRateLimitFetchOptions
): Promise<ProviderRateLimits> {
  throw new Error('This service is not included in the internal edition.')
}

export async function consumeCodexRateLimitResetCreditFromBackend(
  _options: {
    codexHomePath?: string | null
    idempotencyKey: string
  },
  _request: CodexBackendRequest
): Promise<CodexRateLimitResetOutcome> {
  throw new Error('This service is not included in the internal edition.')
}
