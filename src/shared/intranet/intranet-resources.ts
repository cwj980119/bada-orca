import * as z from 'zod'
import { IntranetMcpAuthSchema } from './intranet-mcp-auth'

const envName = z
  .string()
  .trim()
  .regex(/^$|^[A-Za-z_][A-Za-z0-9_]*$/)
  .max(128)

export const IntranetMcpServerSchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-zA-Z0-9_-]{1,64}$/)
      .refine((id) => id !== 'orca-resources' && id !== 'orca-bada'),
    name: z.string().trim().max(128),
    purpose: z.enum(['tools', 'knowledge']),
    enabled: z.boolean(),
    transport: z.enum(['http', 'sse', 'stdio']),
    url: z.string().trim().max(2048),
    command: z.string().trim().max(2048),
    args: z.array(z.string().max(2048)).max(64),
    tokenEnv: envName,
    auth: IntranetMcpAuthSchema.optional()
  })
  .strict()
  .superRefine((server, context) => {
    if (server.transport === 'stdio') {
      if (!server.command) {
        context.addIssue({
          code: 'custom',
          path: ['command'],
          message: '실행 명령을 입력해 주세요.'
        })
      }
      return
    }
    try {
      const url = new URL(server.url)
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash
      ) {
        throw new Error('Invalid MCP server URL.')
      }
      if (
        server.auth &&
        server.auth.type !== 'none' &&
        url.protocol !== 'https:' &&
        !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      ) {
        context.addIssue({
          code: 'custom',
          path: ['url'],
          message: '인증 연결은 HTTPS 주소를 사용해 주세요. 이 PC의 localhost는 HTTP도 지원합니다.'
        })
      }
    } catch {
      context.addIssue({
        code: 'custom',
        path: ['url'],
        message: '인증값·쿼리·프래그먼트가 없는 HTTP(S) 주소를 입력해 주세요.'
      })
    }
  })

export const IntranetResourceSourceSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
    name: z.string().trim().min(1).max(128),
    kind: z.enum(['skills', 'knowledge']),
    path: z
      .string()
      .trim()
      .min(1)
      .max(2048)
      .refine((path) => !/^[a-z]+:\/\//i.test(path), '로컬 또는 공유 폴더 경로를 입력해 주세요.'),
    enabled: z.boolean()
  })
  .strict()

export const IntranetResourcesSchema = z
  .object({
    mcpServers: z.array(IntranetMcpServerSchema).max(64),
    sources: z.array(IntranetResourceSourceSchema).max(64),
    bridgeCommand: z.string().trim().min(1).max(2048).default('orca')
  })
  .strict()
  .superRefine((value, context) => {
    for (const field of ['mcpServers', 'sources'] as const) {
      if (new Set(value[field].map((entry) => entry.id)).size !== value[field].length) {
        context.addIssue({ code: 'custom', path: [field], message: '연결 ID가 중복되었습니다.' })
      }
    }
  })

export type IntranetResources = z.infer<typeof IntranetResourcesSchema>
export type IntranetMcpServer = z.infer<typeof IntranetMcpServerSchema>
export type IntranetResourceSource = z.infer<typeof IntranetResourceSourceSchema>

export function emptyIntranetResources(): IntranetResources {
  return { mcpServers: [], sources: [], bridgeCommand: 'orca' }
}
