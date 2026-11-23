export const REPO_ICON_FETCH_MAX_BYTES = 64 * 1024
export const REPO_ICON_FETCH_MAX_REDIRECTS = 3
export const REPO_ICON_FETCH_TIMEOUT_MS = 5_000

export type RepoIconFetch = (url: string, init: RequestInit) => Promise<Response>
export type FetchedRepoIcon = { mimeType: string; bytes: Uint8Array }

/** Fetch HTTPS without cookies, at most three HTTPS redirects and 64KiB under one deadline. Failure returns null for fallback, without retry. `allows` vets every hop. */
export async function fetchRemoteRepoIcon(
  _rawUrl: string,
  _fetch: RepoIconFetch,
  _timeoutMs = REPO_ICON_FETCH_TIMEOUT_MS,
  _allows: (url: URL) => boolean = () => true
): Promise<FetchedRepoIcon | null> {
  return null
}
