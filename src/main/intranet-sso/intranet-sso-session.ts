import { createHash } from 'node:crypto'
import { z } from 'zod'
import { SealedJsonFile } from '../../shared/secure-storage/sealed-json-file'
import {
  IntranetSsoTokensSchema,
  type IntranetSsoSession,
  type IntranetSsoSettings
} from '../../shared/intranet/intranet-sso'

const Session = z.object({
  fingerprint: z.string(),
  identity: z.object({
    issuer: z.string(),
    subject: z.string().min(1).max(512),
    name: z.string().nullable(),
    email: z.string().nullable(),
    expiresAt: z.number().finite()
  }),
  tokens: IntranetSsoTokensSchema.optional(),
  clientSecret: z.string().max(8192).optional(),
  nonce: z.string().max(512).optional()
})

export function ssoConfigurationKey(settings: IntranetSsoSettings): string {
  return createHash('sha256').update(JSON.stringify(settings)).digest('hex')
}

export class IntranetSsoSessionFile {
  private readonly file: SealedJsonFile

  constructor(path: string) {
    this.file = new SealedJsonFile(path)
  }

  read(fingerprint: string): IntranetSsoSession | null {
    try {
      const parsed = Session.safeParse(this.file.read())
      return parsed.success && parsed.data.fingerprint === fingerprint
        ? {
            identity: parsed.data.identity,
            tokens: parsed.data.tokens,
            ...(parsed.data.clientSecret ? { clientSecret: parsed.data.clientSecret } : {}),
            ...(parsed.data.nonce ? { nonce: parsed.data.nonce } : {})
          }
        : null
    } catch {
      return null
    }
  }

  save(fingerprint: string, session: IntranetSsoSession): boolean {
    return this.file.save({ fingerprint, ...session })
  }

  clear(): void {
    this.file.clear()
  }
}
