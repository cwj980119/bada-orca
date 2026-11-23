import type { GitHubRepoExecution } from '../repositories/github-api-repository'

export async function uploadGitHubImage(_args: {
  fileName: string
  contentType: string
  bytes: Buffer
  signal?: AbortSignal
  resolve: (signal: AbortSignal) => Promise<GitHubRepoExecution>
}): Promise<{ url: string }> {
  throw new Error('This service is not included in the internal edition.')
}
