import type { LookupFunction } from 'node:net'

export type LinkPreviewResource = {
  url: URL
  mimeType: string
  contentType: string
  body: Buffer
}

export type LinkPreviewResourceRequest = {
  kind: 'page' | 'image'
  mimeTypes: ReadonlySet<string>
  maxBytes: number
  signal: AbortSignal
  lookup?: LookupFunction
}

export async function fetchLinkPreviewResource(
  _target: string,
  _request: LinkPreviewResourceRequest
): Promise<LinkPreviewResource | null> {
  throw new Error('This service is not included in the internal edition.')
}
