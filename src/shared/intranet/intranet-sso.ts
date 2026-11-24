import { z } from 'zod'

export const DEFAULT_INTRANET_SSO_CALLBACK_PORT = 18080
export const BADA_SSO_ISSUER = 'http://bada.samsungsdi.com'
export const BADA_SSO_CLIENT_SECRET_ENV = 'ORCA_BADA_CLIENT_SECRET'

export function intranetSsoCallbackPort(port: number): number {
  return port || DEFAULT_INTRANET_SSO_CALLBACK_PORT
}

export function isIntranetSsoEndpoint(value: string): boolean {
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
          (url.origin === BADA_SSO_ISSUER ||
            ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname))))
    )
  } catch {
    return false
  }
}

const endpoint = z
  .string()
  .trim()
  .max(2048)
  .refine(isIntranetSsoEndpoint, 'Use HTTPS, without credentials, a query, or a fragment.')

export const IntranetSsoSettingsSchema = z
  .object({
    enabled: z.boolean(),
    protocol: z.enum(['oidc', 'oauth2']),
    label: z.string().trim().max(80),
    issuer: endpoint,
    clientId: z.string().trim().max(512),
    clientSecretEnv: z
      .string()
      .trim()
      .max(128)
      .regex(/^$|^[A-Za-z_][A-Za-z0-9_]*$/)
      .default(''),
    tokenEndpointAuthMethod: z
      .enum(['none', 'client_secret_basic', 'client_secret_post'])
      .default('none'),
    scopes: z.string().trim().max(1024),
    authorizationUrl: endpoint,
    tokenUrl: endpoint,
    userInfoUrl: endpoint,
    subjectClaim: z.string().trim().max(128),
    callbackPort: z
      .number()
      .int()
      .min(0)
      .max(65535)
      .refine((port) => port === 0 || port >= 1024)
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.enabled) {
      return
    }
    const required: (keyof typeof value)[] = ['clientId', 'subjectClaim']
    if (value.protocol === 'oidc') {
      required.push('issuer')
    } else {
      required.push('authorizationUrl', 'tokenUrl', 'userInfoUrl')
    }
    for (const key of required) {
      if (!value[key]) {
        context.addIssue({ code: 'custom', path: [key], message: 'Required for company sign-in.' })
      }
    }
    if (value.protocol === 'oidc' && !value.scopes.split(/\s+/).includes('openid')) {
      context.addIssue({
        code: 'custom',
        path: ['scopes'],
        message: 'OIDC requires the openid scope.'
      })
    }
  })

export type IntranetSsoSettings = z.infer<typeof IntranetSsoSettingsSchema>
export function defaultIntranetSsoSettings(): IntranetSsoSettings {
  return {
    enabled: false,
    protocol: 'oidc',
    label: 'BADA',
    issuer: BADA_SSO_ISSUER,
    clientId: '',
    clientSecretEnv: BADA_SSO_CLIENT_SECRET_ENV,
    tokenEndpointAuthMethod: 'client_secret_basic',
    scopes: 'openid profile email',
    authorizationUrl: `${BADA_SSO_ISSUER}/oauth2/authorize`,
    tokenUrl: `${BADA_SSO_ISSUER}/oauth2/token`,
    userInfoUrl: `${BADA_SSO_ISSUER}/oauth2/userinfo`,
    subjectClaim: 'sub',
    callbackPort: DEFAULT_INTRANET_SSO_CALLBACK_PORT
  }
}

export function badaSsoSettings(value?: IntranetSsoSettings): IntranetSsoSettings {
  return {
    ...defaultIntranetSsoSettings(),
    enabled: Boolean(value?.clientId.trim()),
    clientId: value?.clientId ?? '',
    clientSecretEnv: value?.clientSecretEnv || BADA_SSO_CLIENT_SECRET_ENV,
    tokenEndpointAuthMethod:
      value?.tokenEndpointAuthMethod === 'client_secret_post'
        ? 'client_secret_post'
        : 'client_secret_basic'
  }
}

export type IntranetSsoIdentity = {
  issuer: string
  subject: string
  name: string | null
  email: string | null
  expiresAt: number
}

export const IntranetSsoTokensSchema = z.object({
  accessToken: z.string().min(1).max(65536),
  idToken: z.string().min(1).max(65536).nullable(),
  expiresAt: z.number().finite().positive()
})
export type IntranetSsoTokens = z.infer<typeof IntranetSsoTokensSchema>
export type IntranetSsoSession = {
  identity: IntranetSsoIdentity
  tokens?: IntranetSsoTokens
}
export type BadaCredentials = IntranetSsoIdentity & IntranetSsoTokens

export type IntranetSsoStatus = {
  state: 'unconfigured' | 'signed-out' | 'authorizing' | 'signed-in' | 'expired' | 'error'
  identity: IntranetSsoIdentity | null
  persistence: 'encrypted' | 'memory'
  error: string | null
}

export const IntranetSsoParams = z.object({})
export const IntranetSsoSignInParams = z.object({ clientSecret: z.string().max(8192).optional() })
export const INTRANET_SSO_CALLBACK_PATH = '/intranet/oauth/callback'
