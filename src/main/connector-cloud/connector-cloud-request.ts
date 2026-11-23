import type { z } from 'zod'

export type ConnectorFailure = {
  ok: false

  status: number | null

  error: string | null
  retryAfterMs: number | null

  message?: string

  sessionRefused?: true
}

export const UNREADABLE_ANSWER: ConnectorFailure = {
  ok: false,
  status: null,
  error: null,
  retryAfterMs: null
}

export function connectorStop(_failure: ConnectorFailure): string | null {
  throw new Error('This service is not included in the internal edition.')
}

export function connectorStopNeedsSignIn(_stop: string | null): boolean {
  throw new Error('This service is not included in the internal edition.')
}

export const SIGNED_OUT: ConnectorFailure = {
  ok: false,
  status: 401,
  error: 'signed_out',
  retryAfterMs: null
}

export type ConnectorResult<T> = { ok: true; value: T } | ConnectorFailure

export type ConnectorRequest = {
  fetchImpl: typeof globalThis.fetch
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'

  body?: unknown
  token?: string
  timeoutMs?: number
  signal?: AbortSignal
}

export const CONNECTOR_MAX_RETRY_AFTER_MS = 10 * 60_000

export async function requestConnector<TSchema extends z.ZodType>(
  _request: ConnectorRequest,
  _schema: TSchema
): Promise<ConnectorResult<z.infer<TSchema>>> {
  throw new Error('This service is not included in the internal edition.')
}
