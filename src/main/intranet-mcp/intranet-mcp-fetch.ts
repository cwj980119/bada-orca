import type { FetchLike } from '@modelcontextprotocol/sdk/shared/transport.js'
import { getMainHttpClient } from '../network/http-client'
import { assertIntranetRequest } from '../network/intranet-network'

export function assertMcpCredentialEndpoint(value: string): void {
  const url = new URL(value)
  if (
    url.username ||
    url.password ||
    (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
  ) {
    throw new Error('인증 연결은 HTTPS 또는 이 PC의 localhost 주소를 사용해야 합니다.')
  }
  assertIntranetRequest(value)
}

export function intranetMcpOAuthFetch(signal?: AbortSignal): FetchLike {
  return async (input, init) => {
    const url = String(input)
    assertMcpCredentialEndpoint(url)
    return getMainHttpClient().fetch(url, {
      ...init,
      redirect: 'error',
      credentials: 'omit',
      signal: AbortSignal.any([AbortSignal.timeout(20_000), ...(signal ? [signal] : [])])
    })
  }
}
