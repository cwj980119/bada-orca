import * as z from 'zod'
import { isIntranetHostEntry } from './intranet-host-entry'
import { IntranetResourcesSchema } from './intranet-resources'
import { IntranetSsoSettingsSchema } from './intranet-sso'

const endpoint = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    if (!value) {
      return true
    }
    try {
      const url = new URL(value)
      return (
        ['http:', 'https:'].includes(url.protocol) &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash
      )
    } catch {
      return false
    }
  }, 'Enter an HTTP(S) server URL without credentials, a query, or a fragment.')

export const IntranetOpenCodeModelSchema = z
  .object({
    id: z.string().trim().min(1).max(512),
    name: z.string().trim().max(128).default(''),
    purpose: z.string().trim().max(160).default('')
  })
  .strict()

export type IntranetOpenCodeModel = z.infer<typeof IntranetOpenCodeModelSchema>

export const IntranetCliModelsSchema = z
  .object({
    model: z.string().trim().max(512),
    models: z.array(IntranetOpenCodeModelSchema).max(64)
  })
  .strict()
  .superRefine(({ model, models }, context) => {
    if (
      new Set(models.map((entry) => entry.id)).size !== models.length ||
      (model && !models.some((entry) => entry.id === model))
    ) {
      context.addIssue({
        code: 'custom',
        path: ['models'],
        message: '모델 ID는 중복 없이 등록하고 기본 모델은 등록 목록에서 선택해 주세요.'
      })
    }
  })

export const IntranetSettingsSchema = z
  .object({
    resources: IntranetResourcesSchema.optional(),
    sso: IntranetSsoSettingsSchema.optional(),
    cliModels: z
      .record(z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/), IntranetCliModelsSchema)
      .optional(),
    allowedHosts: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(253)
          .refine(isIntranetHostEntry, 'Enter a hostname, IP address, or IPv4 CIDR range.')
      )
      .max(256),
    opencode: z
      .object({
        baseUrl: endpoint,
        model: z.string().trim().max(512),
        models: z.array(IntranetOpenCodeModelSchema).max(64).default([]),
        apiKeyEnv: z
          .string()
          .trim()
          .regex(/^$|^[A-Za-z_][A-Za-z0-9_]*$/)
          .max(128)
          .default(''),
        configVersion: z.enum(['v1', 'v2'])
      })
      .strict()
      .superRefine(({ baseUrl, model, models }, context) => {
        if (baseUrl && !model && models.length === 0) {
          context.addIssue({
            code: 'custom',
            message: 'Register a model for this server.',
            path: ['models']
          })
        }
        if (new Set(models.map((entry) => entry.id)).size !== models.length) {
          context.addIssue({
            code: 'custom',
            message: 'Model IDs must be unique.',
            path: ['models']
          })
        }
        if (models.length && model && !models.some((entry) => entry.id === model)) {
          context.addIssue({
            code: 'custom',
            message: 'Choose a registered default model.',
            path: ['model']
          })
        }
        if (
          !baseUrl &&
          [...models.map((entry) => entry.id), ...(model ? [model] : [])].some(
            (id) => !id.includes('/')
          )
        ) {
          context.addIssue({
            code: 'custom',
            message:
              'Without a server override, use provider/model IDs from your CLI configuration.',
            path: ['models']
          })
        }
      }),
    claude: z
      .object({
        baseUrl: endpoint,
        model: z.string().trim().max(512)
      })
      .strict()
  })
  .strict()

export type IntranetSettings = z.infer<typeof IntranetSettingsSchema>

export function defaultIntranetSettings(): IntranetSettings {
  return {
    allowedHosts: [],
    opencode: { baseUrl: '', model: '', models: [], apiKeyEnv: '', configVersion: 'v1' },
    claude: { baseUrl: '', model: '' }
  }
}

export function readIntranetSettings(value: unknown): IntranetSettings {
  const parsed = IntranetSettingsSchema.safeParse(value)
  return parsed.success ? parsed.data : defaultIntranetSettings()
}

export function intranetAllowedHosts(settings: IntranetSettings): string[] {
  const hosts = [...settings.allowedHosts]
  for (const endpoint of [
    settings.opencode.baseUrl,
    settings.claude.baseUrl,
    ...(settings.sso?.enabled
      ? [
          settings.sso.issuer,
          settings.sso.authorizationUrl,
          settings.sso.tokenUrl,
          settings.sso.userInfoUrl
        ]
      : []),
    ...(settings.resources?.mcpServers
      .filter((server) => server.enabled && server.transport === 'http')
      .map((server) => server.url) ?? [])
  ]) {
    if (endpoint) {
      hosts.push(new URL(endpoint).hostname)
    }
  }
  return hosts
}
