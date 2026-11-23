import type { Repo } from '../../../../shared/repository/repo-types'

import { getRepoExecutionHostId } from '../../../../shared/execution-host/execution-host'

export const SAFE_AUTO_FORK_SYNC_COOLDOWN_MS = 10 * 60 * 1000
export const safeAutoForkSyncAttempts = new Map<
  string,
  {
    attemptedAt: number
    promise?: Promise<void>
  }
>()
export function getSafeAutoForkSyncKey(repo: Repo): string {
  return `${getRepoExecutionHostId(repo)}:${repo.id}:${repo.path}`
}
export function scheduleSafeAutoForkSync(_repos: readonly Repo[]): void {}
