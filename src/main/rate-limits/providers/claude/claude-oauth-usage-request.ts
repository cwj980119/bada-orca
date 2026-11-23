import type { ProviderRateLimits } from '../../../../shared/agent-usage/rate-limits/rate-limit-types'

export async function fetchClaudeOAuthUsage(
  _token: string,
  _signal?: AbortSignal
): Promise<ProviderRateLimits> {
  throw new Error('This service is not included in the internal edition.')
}
