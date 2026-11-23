import { createRemoteRefProbeCache } from '../git/remotes/remote-ref-probe-cache'

export type AzureDevOpsRepoRef = {
  host: string
  project: string
  repository: string
  apiBaseUrl: string
  webBaseUrl: string
  organization?: string | null
}

type LocalGitExecOptions = {
  wslDistro?: string
}

const repoRefProbeCache = createRemoteRefProbeCache(parseAzureDevOpsRepoRef)

/** @internal - exposed for tests only */
export function _resetAzureDevOpsRepoRefCache(): void {
  repoRefProbeCache.clear()
}

/** @internal - exposed for tests only */
export function _getAzureDevOpsRepoRefCacheSize(): number {
  return repoRefProbeCache.size()
}

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function encodeSegment(value: string): string {
  return encodeURIComponent(value)
}

function splitPath(path: string): string[] {
  return path
    .replace(/\/+$/, '')
    .replace(/\.git$/i, '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .map(decodeSegment)
}

function joinUrl(origin: string, segments: readonly string[]): string {
  const path = segments.map(encodeSegment).join('/')
  return path ? `${origin.replace(/\/+$/, '')}/${path}` : origin.replace(/\/+$/, '')
}

function parseGitHttpPath(
  pathname: string
): { prefix: string[]; project: string; repository: string } | null {
  const parts = splitPath(pathname)
  const gitIndex = parts.findIndex((part) => part.toLowerCase() === '_git')
  if (gitIndex < 1 || gitIndex + 1 >= parts.length) {
    return null
  }
  const project = parts[gitIndex - 1]
  const repository = parts[gitIndex + 1]
  if (!project || !repository) {
    return null
  }
  return {
    prefix: parts.slice(0, gitIndex - 1),
    project,
    repository
  }
}

function makeServerRef(
  host: string,
  origin: string,
  prefix: readonly string[],
  project: string,
  repository: string
): AzureDevOpsRepoRef {
  return {
    host: host.toLowerCase(),
    organization: null,
    project,
    repository,
    apiBaseUrl: joinUrl(origin, [...prefix, project]),
    webBaseUrl: joinUrl(origin, [...prefix, project, '_git', repository])
  }
}

function parseDevAzureUrl(_url: URL): AzureDevOpsRepoRef | null {
  return null
}

function parseVisualStudioUrl(_url: URL): AzureDevOpsRepoRef | null {
  return null
}

function parseCloudSshPath(_host: string, _rawPath: string): AzureDevOpsRepoRef | null {
  return null
}

function isCloudSshHost(host: string): boolean {
  return host === 'ssh.dev.azure.com' || host === 'vs-ssh.visualstudio.com'
}

function parseScpLike(_remoteUrl: string): AzureDevOpsRepoRef | null {
  return null
}

export function parseAzureDevOpsRepoRef(remoteUrl: string): AzureDevOpsRepoRef | null {
  const trimmed = remoteUrl.trim()
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return parseScpLike(trimmed)
  }

  try {
    const url = new URL(trimmed)
    const host = url.hostname.toLowerCase()
    if (isCloudSshHost(host)) {
      return parseCloudSshPath(host, url.pathname)
    }
    if (!['http:', 'https:', 'ssh:', 'git+ssh:'].includes(url.protocol.toLowerCase())) {
      return null
    }
    if (host === 'dev.azure.com') {
      return parseDevAzureUrl(url)
    }
    if (host.endsWith('.visualstudio.com')) {
      return parseVisualStudioUrl(url)
    }

    const parsed = parseGitHttpPath(url.pathname)
    if (!parsed || !['http:', 'https:'].includes(url.protocol.toLowerCase())) {
      return null
    }
    // Self-hosted Azure remotes are identified by the _git path, not the hostname.
    return makeServerRef(host, url.origin, parsed.prefix, parsed.project, parsed.repository)
  } catch {
    return null
  }
}

export async function getAzureDevOpsRepoRefForRemote(
  repoPath: string,
  remoteName: string,
  connectionId?: string | null,
  localGitOptions: LocalGitExecOptions = {}
): Promise<AzureDevOpsRepoRef | null> {
  return repoRefProbeCache.get(repoPath, remoteName, connectionId, localGitOptions)
}

export async function getAzureDevOpsRepoRef(
  repoPath: string,
  connectionId?: string | null,
  localGitOptions: LocalGitExecOptions = {}
): Promise<AzureDevOpsRepoRef | null> {
  return getAzureDevOpsRepoRefForRemote(repoPath, 'origin', connectionId, localGitOptions)
}
