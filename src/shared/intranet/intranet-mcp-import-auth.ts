import { asRecord } from '../workspace-setup/setup-script-import-parsers'
import { IntranetMcpAuthSchema, type IntranetMcpAuth } from './intranet-mcp-auth'

const envReference = (value: unknown): string | undefined =>
  typeof value === 'string'
    ? /^(?:\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\{env:([A-Za-z_][A-Za-z0-9_]*)\})$/
        .exec(value)
        ?.slice(1)
        .find(Boolean)
    : undefined

export function importMcpAuthentication(server: Record<string, unknown>): {
  tokenEnv: string
  auth?: IntranetMcpAuth
} {
  const headers = asRecord(server.headers ?? server.http_headers) ?? {}
  const entries = Object.entries(headers)
  const oauth = asRecord(server.oauth)
  if (server.auth !== undefined) {
    return { tokenEnv: '', auth: IntranetMcpAuthSchema.parse(server.auth) }
  }
  if (oauth || server.oauth === true) {
    if (entries.length || server.bearer_token_env_var) {
      throw new Error(
        'OAuth와 인증 헤더를 함께 가져올 수 없습니다. 인증 방식을 하나 선택해 주세요.'
      )
    }
    const secret = oauth?.clientSecret ?? oauth?.client_secret
    const env = envReference(secret)
    if (secret && !env) {
      throw new Error('Client secret은 가져온 후 보안 입력란에 직접 저장해 주세요.')
    }
    const scopes = oauth?.scope ?? oauth?.scopes ?? ''
    return {
      tokenEnv: '',
      auth: IntranetMcpAuthSchema.parse({
        type: 'oauth',
        flow: 'authorization_code',
        clientId: oauth?.clientId ?? oauth?.client_id ?? '',
        scopes: Array.isArray(scopes) ? scopes.join(' ') : scopes,
        ...(env ? { clientSecret: { source: 'env', env } } : {})
      })
    }
  }
  if (entries.length > 1) {
    throw new Error('여러 인증 헤더는 가져올 수 없습니다. 인증 헤더 하나를 선택해 주세요.')
  }
  if (!entries.length) {
    return {
      tokenEnv: typeof server.bearer_token_env_var === 'string' ? server.bearer_token_env_var : ''
    }
  }
  const [header, value] = entries[0]!
  if (header.toLowerCase() === 'authorization' && typeof value === 'string') {
    const env = /^Bearer\s+(.+)$/i.exec(value)?.[1]
    const name = envReference(env)
    if (name) {
      return { tokenEnv: name }
    }
  } else {
    const env = envReference(value)
    if (env) {
      return {
        tokenEnv: '',
        auth: IntranetMcpAuthSchema.parse({
          type: 'api-key',
          header,
          secret: { source: 'env', env }
        })
      }
    }
  }
  throw new Error(
    '인증 헤더에는 ${환경변수} 또는 {env:환경변수}를 사용해 주세요. 직접 입력한 토큰은 저장하지 않습니다. 가져온 후 보안 입력란을 사용해 주세요.'
  )
}
