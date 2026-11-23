import type { ArtifactWriteRequest } from '../../shared/artifacts/artifacts'

import type { ArtifactRateLimitReplay } from './artifact-cloud-auth-context'

export type ArtifactWriteBody = {
  content: string
  contentType: ArtifactWriteRequest['contentType']
  fileName: string
  title?: string
}

export function artifactWriteBody(_request: ArtifactWriteRequest): ArtifactWriteBody {
  throw new Error('This service is not included in the internal edition.')
}

type ArtifactRequestOptions = {
  method?: string
  body?: unknown
  editToken?: string
  idempotencyKey?: string

  rateLimitReplay?: ArtifactRateLimitReplay
}

export async function artifactRequest<T>(
  _apiUrl: string,
  _token: string,
  _path: string,
  _options: ArtifactRequestOptions = {}
): Promise<T> {
  throw new Error('This service is not included in the internal edition.')
}
