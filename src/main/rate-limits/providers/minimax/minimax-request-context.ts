import type { MiniMaxEndpoint } from '../../../../shared/settings/global-settings-types'

export function getMiniMaxEndpointUrl(_endpoint: MiniMaxEndpoint): string {
  throw new Error('This service is not included in the internal edition.')
}

export const MINIMAX_USAGE_ENDPOINT = getMiniMaxEndpointUrl('overseas')

const MINIMAX_API_KEY_TIMEOUT_MS = 10_000

export type MiniMaxFetchTransport = 'session-cookie-jar' | 'manual-cookie-header' | 'api-key'

export type MiniMaxFetchResponse = {
  response: Response
  requestHeaderNames: string[]
  cookieNames: string[]
  transport: MiniMaxFetchTransport
}

export function extractMiniMaxCookieValue(_cookie: string, _name: string): string | null {
  throw new Error('This service is not included in the internal edition.')
}

export function normalizeMiniMaxCookieHeader(_cookie: string): string {
  throw new Error('This service is not included in the internal edition.')
}

export function getUniqueMiniMaxCookieNames(_cookie: string): string[] {
  throw new Error('This service is not included in the internal edition.')
}

export function redactMiniMaxSecret(_value: string): string {
  throw new Error('This service is not included in the internal edition.')
}

export function makeMiniMaxRequestHeaders(
  _groupId: string | null,
  _endpoint: MiniMaxEndpoint
): Record<string, string> {
  throw new Error('This service is not included in the internal edition.')
}

export async function clearMiniMaxSessionCookieJar(): Promise<void> {
  throw new Error('This service is not included in the internal edition.')
}

export async function fetchMiniMaxWithSessionCookieJar(_args: {
  cookie: string
  endpoint: string
  groupId: string | null
  endpointMode: MiniMaxEndpoint
  signal: AbortSignal
}): Promise<MiniMaxFetchResponse> {
  throw new Error('This service is not included in the internal edition.')
}

export async function fetchMiniMaxWithManualCookieHeader(_args: {
  cookie: string
  endpoint: string
  groupId: string | null
  endpointMode: MiniMaxEndpoint
  signal: AbortSignal
}): Promise<MiniMaxFetchResponse> {
  throw new Error('This service is not included in the internal edition.')
}

export async function fetchMiniMaxWithApiKey(_args: {
  apiKey: string
  endpoint: string
  signal: AbortSignal
}): Promise<MiniMaxFetchResponse> {
  throw new Error('This service is not included in the internal edition.')
}

export { MINIMAX_API_KEY_TIMEOUT_MS }

export function logMiniMaxFetchFailure(_details: {
  transport: MiniMaxFetchTransport
  responseStatus?: number
  statusCode?: unknown
  statusMsg?: unknown
  cookieNames: string[]
  requestHeaderNames: string[]
}): void {
  throw new Error('This service is not included in the internal edition.')
}
