import type { z } from 'zod'

export const PUSH_REQUEST_DEADLINE_MS = 15_000

export type PushGatewayFailure = { ok: false; reason: 'unreachable' | 'rejected' }
export type PushGatewayResult<T> = ({ ok: true } & T) | PushGatewayFailure
export type PushGatewayResponse = { ok: true; response: Response } | PushGatewayFailure

export async function postPushGatewayJson(
  _fetchImpl: typeof globalThis.fetch,
  _url: string,
  _body: unknown
): Promise<PushGatewayResponse> {
  throw new Error('This service is not included in the internal edition.')
}

export async function readPushGatewayJson<TSchema extends z.ZodType>(
  _result: PushGatewayResponse,
  _schema: TSchema
): Promise<{ ok: true; value: z.infer<TSchema> } | PushGatewayFailure> {
  throw new Error('This service is not included in the internal edition.')
}
