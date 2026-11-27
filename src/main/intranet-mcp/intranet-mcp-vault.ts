import { createHash } from 'node:crypto'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod'
import {
  OAuthTokensSchema,
  OAuthClientInformationSchema,
  OAuthMetadataSchema,
  OpenIdProviderMetadataSchema,
  OAuthProtectedResourceMetadataSchema
} from '@modelcontextprotocol/sdk/shared/auth.js'
import { SealedJsonFile } from '../../shared/secure-storage/sealed-json-file'
import { effectiveMcpAuth } from '../../shared/intranet/intranet-mcp-auth'
import type { IntranetMcpServer } from '../../shared/intranet/intranet-resources'

const SessionSchema = z.object({
  fingerprint: z.string(),
  generation: z.string().optional(),
  secret: z.string().max(8192).optional(),
  client: OAuthClientInformationSchema.optional(),
  tokens: OAuthTokensSchema.optional(),
  expiresAt: z.number().optional(),
  redirectUri: z.string().optional(),
  discovery: z
    .object({
      authorizationServerUrl: z.string(),
      resourceMetadataUrl: z.string().optional(),
      authorizationServerMetadata: z
        .union([OAuthMetadataSchema, OpenIdProviderMetadataSchema])
        .optional(),
      resourceMetadata: OAuthProtectedResourceMetadataSchema.optional()
    })
    .optional()
})

export type McpSession = z.infer<typeof SessionSchema>

export function mcpConfigurationKey(server: IntranetMcpServer): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        id: server.id,
        url: server.url,
        transport: server.transport,
        auth: effectiveMcpAuth(server)
      })
    )
    .digest('hex')
}

export class IntranetMcpVault {
  constructor(private readonly root = join(homedir(), '.orca', 'intranet-mcp')) {}

  private file(server: IntranetMcpServer): SealedJsonFile {
    return new SealedJsonFile(join(this.root, `${mcpConfigurationKey(server)}.json`))
  }

  read(server: IntranetMcpServer): McpSession {
    const fingerprint = mcpConfigurationKey(server)
    const parsed = SessionSchema.safeParse(this.file(server).read())
    return parsed.success && parsed.data.fingerprint === fingerprint ? parsed.data : { fingerprint }
  }

  save(server: IntranetMcpServer, session: McpSession): void {
    if (!this.file(server).save({ ...session, fingerprint: mcpConfigurationKey(server) })) {
      throw new Error('보안 저장소를 사용할 수 없습니다. OS 키체인 설정을 확인해 주세요.')
    }
  }

  clear(server: IntranetMcpServer): void {
    this.file(server).clear()
  }
}
