export const MAX_RESPONSE_BYTES = 1024 * 1024

export function postJsonForJson(
  _url: string,
  _body: unknown,
  _timeoutMs: number
): Promise<unknown> {
  throw new Error('This service is not included in the internal edition.')
}

export function postBodyForJson(_options0: {
  readonly url: string
  readonly body: string
  readonly headers: Record<string, string>
  readonly timeoutMs: number
}): Promise<unknown> {
  throw new Error('This service is not included in the internal edition.')
}
