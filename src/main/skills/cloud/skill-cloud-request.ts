export async function skillCloudRequest<T>(_input: {
  apiUrl?: string
  authToken?: string
  path: string
  method?: 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT'
  body?: unknown
  signal?: AbortSignal
  idempotencyKey?: string
  fetcher?: typeof fetch
  timeoutMs?: number
}): Promise<T> {
  throw new Error('This service is not included in the internal edition.')
}
