import { z } from 'zod'

export const ExternalAgentCredentialParams = z
  .object({
    address: z.string().startsWith('external:').max(80),
    token: z.string().min(32).max(128)
  })
  .strict()
export const ExternalAgentRegisterParams = z
  .object({
    agent: z.enum(['opencode', 'claude']),
    name: z.string().trim().min(1).max(128),
    cwd: z.string().max(4096)
  })
  .strict()
export const ExternalAgentReceiveParams = ExternalAgentCredentialParams.extend({
  waitSeconds: z.number().int().min(0).max(25).default(0)
})
export const ExternalAgentAckParams = ExternalAgentCredentialParams.extend({
  ids: z.array(z.string()).min(1).max(50)
})
export const ExternalAgentSendParams = ExternalAgentCredentialParams.extend({
  to: z.string().min(1).max(256),
  subject: z.string().min(1).max(200),
  body: z.string().max(32_000)
})
