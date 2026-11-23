import { z } from 'zod'

export const DEFAULT_INTRANET_SSO_CALLBACK_PORT = 18080

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
        (url.protocol === 'http:' && ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname)))
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
    label: '',
    issuer: '',
    clientId: '',
    scopes: 'openid profile email',
    authorizationUrl: '',
    tokenUrl: '',
    userInfoUrl: '',
    subjectClaim: 'sub',
    callbackPort: DEFAULT_INTRANET_SSO_CALLBACK_PORT
  }
}

export type IntranetSsoIdentity = {
  issuer: string
  subject: string
  name: string | null
  email: string | null
  expiresAt: number
}

export type IntranetSsoStatus = {
  state: 'unconfigured' | 'signed-out' | 'authorizing' | 'signed-in' | 'expired' | 'error'
  identity: IntranetSsoIdentity | null
  persistence: 'encrypted' | 'memory'
  error: string | null
}

export const IntranetSsoParams = z.object({})
export const INTRANET_SSO_CALLBACK_PATH = '/intranet/oauth/callback'
