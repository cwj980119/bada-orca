import { z } from 'zod'
import { IntranetMcpServerSchema } from './intranet-resources'

export const IntranetMcpAuthParams = z.object({ server: IntranetMcpServerSchema }).strict()
export const IntranetMcpSecretParams = IntranetMcpAuthParams.extend({
  secret: z.string().min(1).max(8192)
}).strict()
export const IntranetMcpConnectionParams = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
    rejectedToken: z.string().max(16_384).optional()
  })
  .strict()

export type IntranetMcpConnection = {
  transport: 'http' | 'sse'
  url: string
  headers: Record<string, string>
}
