import { readFileSync, statSync, unlinkSync } from 'node:fs'
import { getSecretStore } from './secret-store'
import { writeSecureFile } from './secure-file'

export class SealedJsonFile {
  constructor(private readonly path: string) {}

  read(): unknown {
    try {
      if (statSync(this.path).size > 512 * 1024) {
        return null
      }
      const ciphertext = readFileSync(this.path, 'utf8')
      return JSON.parse(getSecretStore().decryptString(Buffer.from(ciphertext, 'base64')))
    } catch {
      return null
    }
  }

  save(value: unknown): boolean {
    const store = getSecretStore()
    if (!store.isEncryptionAvailable() || store.describeProtectionGap() !== null) {
      return false
    }
    const ciphertext = store.encryptString(JSON.stringify(value)).toString('base64')
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
