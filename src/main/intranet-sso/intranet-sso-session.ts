import { readFileSync, statSync, unlinkSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { getSecretStore } from '../../shared/secure-storage/secret-store'
import { writeSecureFile } from '../../shared/secure-storage/secure-file'
import type { IntranetSsoIdentity, IntranetSsoSettings } from '../../shared/intranet/intranet-sso'

const Session = z.object({
  fingerprint: z.string(),
  identity: z.object({
    issuer: z.string(),
    subject: z.string().min(1).max(512),
    name: z.string().nullable(),
    email: z.string().nullable(),
    expiresAt: z.number().finite()
  })
})

export function ssoConfigurationKey(settings: IntranetSsoSettings): string {
  return createHash('sha256').update(JSON.stringify(settings)).digest('hex')
}

export class IntranetSsoSessionFile {
  constructor(private readonly path: string) {}

  read(fingerprint: string): IntranetSsoIdentity | null {
    try {
      if (statSync(this.path).size > 32 * 1024) {
        return null
      }
      const ciphertext = readFileSync(this.path, 'utf8')
      const parsed = Session.safeParse(
        JSON.parse(getSecretStore().decryptString(Buffer.from(ciphertext, 'base64')))
      )
      return parsed.success && parsed.data.fingerprint === fingerprint ? parsed.data.identity : null
    } catch {
      return null
    }
  }

  save(fingerprint: string, identity: IntranetSsoIdentity): boolean {
    const store = getSecretStore()
    if (!store.isEncryptionAvailable() || store.describeProtectionGap() !== null) {
      return false
    }
    const ciphertext = store
      .encryptString(JSON.stringify({ fingerprint, identity }))
      .toString('base64')
    return writeSecureFile(this.path, ciphertext, { durable: true, ownerOnly: true })
  }

  clear(): void {
    try {
      unlinkSync(this.path)
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) {
        throw new Error('storage_failed')
      }
    }
  }
}
