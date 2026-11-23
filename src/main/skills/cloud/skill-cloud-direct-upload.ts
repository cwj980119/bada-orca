type SignedPostPolicy = {
  url: string
  fields: Record<string, string>
  expiresAt?: string
}

export async function uploadSkillPackageToSignedPolicy(_input: {
  policy: SignedPostPolicy
  archivePath: string
  expectedBytes: number
  signal?: AbortSignal
  onProgress?: (bytesSent: number) => void
  fetcher?: typeof fetch
  timeoutMs?: number
}): Promise<void> {
  throw new Error('This service is not included in the internal edition.')
}
