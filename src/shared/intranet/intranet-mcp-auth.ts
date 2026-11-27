import { z } from 'zod'

export const McpSecretReferenceSchema = z
  .object({
    source: z.enum(['env', 'stored']),
    env: z
      .string()
      .trim()
      .regex(/^$|^[A-Za-z_][A-Za-z0-9_]*$/)
      .max(128)
  })
  .strict()
  .superRefine((value, context) => {
    if (value.source === 'env' && !value.env) {
      context.addIssue({ code: 'custom', path: ['env'], message: '환경변수 이름을 입력해 주세요.' })
    }
  })

export const IntranetMcpAuthSchema = z
  .discriminatedUnion('type', [
    z.object({ type: z.literal('none') }).strict(),
    z.object({ type: z.literal('bearer'), secret: McpSecretReferenceSchema }).strict(),
    z
      .object({
        type: z.literal('api-key'),
        header: z
          .string()
          .trim()
          .regex(/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/)
          .max(128)
          .refine(
            (value) =>
              ![
                'host',
                'cookie',
                'content-length',
                'connection',
                'transfer-encoding',
                'proxy-authorization'
              ].includes(value.toLowerCase()),
            '인증용 헤더 이름을 입력해 주세요.'
          ),
        secret: McpSecretReferenceSchema
      })
      .strict(),
    z
      .object({
        type: z.literal('basic'),
        username: z
          .string()
          .min(1)
          .max(512)
          .refine((value) => !/[:\r\n]/.test(value)),
        secret: McpSecretReferenceSchema
      })
      .strict(),
    z
      .object({
        type: z.literal('oauth'),
        flow: z.enum(['authorization_code', 'client_credentials']),
        clientId: z.string().trim().max(2048),
        clientSecret: McpSecretReferenceSchema.optional(),
        scopes: z.string().trim().max(2048),
        issuer: z
          .string()
          .trim()
          .max(2048)
          .optional()
          .refine((value) => {
            if (!value) {
              return true
            }
            try {
              const url = new URL(value)
              return (
                !url.username &&
                !url.password &&
                !url.search &&
                !url.hash &&
                (url.protocol === 'https:' ||
                  (url.protocol === 'http:' &&
                    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
              )
            } catch {
              return false
            }
          }, '인증 서버의 HTTPS 주소를 입력해 주세요.'),
        clientMetadataUrl: z
          .string()
          .trim()
          .max(2048)
          .optional()
          .refine((value) => {
            if (!value) {
              return true
            }
            try {
              const url = new URL(value)
              return (
                url.protocol === 'https:' &&
                url.pathname !== '/' &&
                !url.username &&
                !url.password &&
                !url.search &&
                !url.hash
              )
            } catch {
              return false
            }
          }, '클라이언트 메타데이터 문서의 HTTPS 주소를 입력해 주세요.'),
        callbackPort: z.number().int().min(1024).max(65535).optional()
      })
      .strict()
  ])
  .superRefine((value, context) => {
    if (
      value.type === 'oauth' &&
      value.flow === 'client_credentials' &&
      (!value.clientId || !value.clientSecret)
    ) {
      context.addIssue({ code: 'custom', message: 'Client ID와 Client secret을 입력해 주세요.' })
    }
    if (value.type === 'oauth' && value.clientSecret && !value.clientId) {
      context.addIssue({
        code: 'custom',
        path: ['clientId'],
        message: 'Client ID를 입력해 주세요.'
      })
    }
  })

export type IntranetMcpAuth = z.infer<typeof IntranetMcpAuthSchema>
export type McpSecretReference = z.infer<typeof McpSecretReferenceSchema>

export function effectiveMcpAuth(server: {
  auth?: IntranetMcpAuth
  tokenEnv: string
}): IntranetMcpAuth {
  return (
    server.auth ??
    (server.tokenEnv
      ? { type: 'bearer', secret: { source: 'env', env: server.tokenEnv } }
      : { type: 'none' })
  )
}

export function mcpAuthSecret(auth: IntranetMcpAuth): McpSecretReference | undefined {
  return auth.type === 'oauth' ? auth.clientSecret : auth.type === 'none' ? undefined : auth.secret
}

export type IntranetMcpAuthStatus = {
  state: 'signed-out' | 'authorizing' | 'ready'
  hasSecret: boolean
  error?: string
}
