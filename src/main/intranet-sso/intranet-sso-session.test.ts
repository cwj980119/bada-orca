import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { mkdtempSync, readFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, expect, it, vi } from 'vitest'
import * as secrets from '../../shared/secure-storage/secret-store'
import { IntranetSsoSessionFile } from './intranet-sso-session'
import { removeTempDirs } from '../../shared/testing/remove-temp-dirs.test-support'

const directories: string[] = []
afterEach(async () => {
  vi.restoreAllMocks()
  const targets = directories.splice(0)
  for (const directory of targets) {
    const target = resolve(directory)
    if (
      dirname(target) !== resolve(tmpdir()) ||
      !basename(target).startsWith('orca-intranet-sso-')
    ) {
      throw new Error('Unexpected SSO test directory')
    }
  }
  await removeTempDirs(targets)
})

function fixture(available = true) {
  const directory = mkdtempSync(join(tmpdir(), 'orca-intranet-sso-'))
  directories.push(directory)
  const key = randomBytes(32)
  vi.spyOn(secrets, 'getSecretStore').mockReturnValue({
    isEncryptionAvailable: () => available,
    describeProtectionGap: () => (available ? null : 'unavailable'),
    encryptString: (text) => {
      const iv = randomBytes(12)
      const cipher = createCipheriv('aes-256-gcm', key, iv)
      const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
      return Buffer.concat([iv, cipher.getAuthTag(), ciphertext])
    },
    decryptString: (sealed) => {
      const cipher = createDecipheriv('aes-256-gcm', key, sealed.subarray(0, 12))
      cipher.setAuthTag(sealed.subarray(12, 28))
      return Buffer.concat([cipher.update(sealed.subarray(28)), cipher.final()]).toString('utf8')
    }
  })
  const path = join(directory, 'session.enc')
  return { path, session: new IntranetSsoSessionFile(path) }
}

const identity = {
  issuer: 'https://company.internal',
  subject: 'employee-7',
  name: 'Alice',
  email: 'alice@company.internal',
  expiresAt: 4_000_000_000_000
}

it('persists a sealed account and tokens bound to the provider configuration', () => {
  const { path, session } = fixture()
  expect(
    session.save('provider-a', {
      identity,
      clientSecret: 'bada-client-secret',
      nonce: 'login-nonce',
      tokens: {
        accessToken: 'bada-access-secret',
        idToken: 'bada-id-secret',
        refreshToken: 'bada-refresh-secret',
        expiresAt: 4_000_000_000_000
      }
    })
  ).toBe(true)
  const text = readFileSync(path, 'utf8')
  expect(text).not.toContain('alice@company.internal')
  expect(text).not.toContain('bada-access-secret')
  expect(text).not.toContain('bada-refresh-secret')
  expect(text).not.toContain('bada-client-secret')
  expect(session.read('provider-a')).toEqual({
    clientSecret: 'bada-client-secret',
    nonce: 'login-nonce',
    identity: {
      issuer: 'https://company.internal',
      subject: 'employee-7',
      name: 'Alice',
      email: 'alice@company.internal',
      expiresAt: 4_000_000_000_000
    },
    tokens: {
      accessToken: 'bada-access-secret',
      idToken: 'bada-id-secret',
      refreshToken: 'bada-refresh-secret',
      expiresAt: 4_000_000_000_000
    }
  })
  expect(session.read('provider-b')).toBeNull()
  session.clear()
  expect(session.read('provider-a')).toBeNull()
})

it('does not fall back to plaintext when protected storage is unavailable', () => {
  const { path, session } = fixture(false)
  expect(session.save('provider-a', { identity })).toBe(false)
  expect(() => readFileSync(path)).toThrow()
})
