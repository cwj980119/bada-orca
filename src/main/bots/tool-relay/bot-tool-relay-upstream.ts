// One call's trip to the tool's server: the agent's request headers that go along, a deadline for
// the server's response headers, and the response streamed back at the agent's pace.
import { once } from 'node:events'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { BotToolCredentialAnswer } from '../tool-oauth/bot-tool-credential-source'

export type RelayFetch = (url: string, init: RequestInit) => Promise<Response>
export type ReadyAnswer = Extract<BotToolCredentialAnswer, { kind: 'ready' }>
const FORWARDED_RESPONSE_HEADERS = [
  'content-type',
  'mcp-session-id',
  'mcp-protocol-version',
  'cache-control',
  'retry-after'
]

/** Sends the call with the credential's headers; the 504 deadline covers only the wait for headers. */
export async function sendUpstream(
  _fetchUpstream: RelayFetch,
  _req: IncomingMessage,
  _answer: ReadyAnswer,
  _body: Buffer | undefined,
  _signal: AbortSignal
): Promise<Response> {
  throw new Error('This service is not included in the internal edition.')
}

/** Sends the response's headers at once, then its body as fast as the agent takes it. */
export async function streamUpstreamResponse(
  res: ServerResponse,
  upstream: Response,
  signal: AbortSignal
): Promise<void> {
  const out: Record<string, string> = {}
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name)
    if (value !== null) {
      out[name] = value
    }
  }
  // A refusal is passed on as 403 so neither CLI starts a sign-in against the relay.
  res.writeHead(upstream.status === 401 ? 403 : upstream.status, out)
  // Sent now, so an event stream that stays quiet still reaches the agent as open.
  res.flushHeaders()
  if (!upstream.body) {
    res.end()
    return
  }
  // Reads the next chunk only once the agent has taken the last one.
  const reader = upstream.body.getReader()
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      if (!res.write(value)) {
        await once(res, 'drain', { signal })
      }
    }
  } catch (error) {
    await reader.cancel().catch(() => {})
    throw error
  }
  res.end()
}

/** Why the tool's server refused, for the Tools row. */
export function refusalProblem(upstream: Response, answer: ReadyAnswer): string {
  if (answer.bearer === undefined) {
    return 'The tool’s server refused its saved values.'
  }
  // A 403 is about permission, not an expired token, so it's never refreshed.
  return /error="?insufficient_scope/.test(upstream.headers.get('www-authenticate') ?? '')
    ? 'The app needs more access than this sign-in allows.'
    : 'The app refused this with the current sign-in.'
}
