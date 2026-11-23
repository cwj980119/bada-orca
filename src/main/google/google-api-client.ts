import type { z } from 'zod'
import type { GoogleService } from '../../shared/google/google-scopes'

import { defaultGoogleTokenDeps, type GoogleTokenDeps } from './google-account-tokens'
import { listGoogleAccounts, readGoogleAccount } from './google-credential-store'

export class GoogleToolError extends Error {
  readonly status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'GoogleToolError'
    if (status !== undefined) {
      this.status = status
    }
  }
}

export function resolveGoogleAccount(wanted: string | undefined): string {
  if (wanted) {
    const record = readGoogleAccount(wanted)
    if (!record) {
      throw new GoogleToolError(
        `${wanted} isn't connected on this computer. \`orca google status\` lists the accounts here.`
      )
    }
    return record.email
  }
  const emails = listGoogleAccounts().map((entry) => entry.email)
  if (emails.length === 1 && emails[0]) {
    return emails[0]
  }
  throw new GoogleToolError(
    emails.length === 0
      ? 'No Google account is connected on this computer. Ask your owner to connect one in Orca.'
      : `Several Google accounts are connected; pick one with --account: ${emails.join(', ')}.`
  )
}

/** A body read with a schema: the value, or null when Google answered in another shape. */
export const parseGoogleJson =
  <T>(schema: z.ZodType<T>) =>
  (body: unknown): T | null =>
    schema.safeParse(body).data ?? null

/** A write: JSON (the usual), or raw bytes such as an upload or a MIME message. */
export type GoogleWrite = {
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  url: string
  json?: unknown
  raw?: { body: Uint8Array<ArrayBuffer> | string; contentType: string }
}

export type GoogleApi = {
  /** The account's address, for output that says whose mail or calendar it is. */
  email: string
  get: <T>(service: GoogleService, url: string, read: (body: unknown) => T | null) => Promise<T>
  /** Like get, but null when Google says the thing doesn't exist (404). */
  find: <T>(
    service: GoogleService,
    url: string,
    read: (body: unknown) => T | null
  ) => Promise<T | null>
  /** A write; `read` gets Google's answer (an empty body reads as null, e.g. after DELETE). */
  send: <T>(
    service: GoogleService,
    write: GoogleWrite,
    read: (body: unknown) => T | null
  ) => Promise<T>
  /** A file's bytes, refused with a sentence once they pass `maxBytes`. */
  bytes: (service: GoogleService, url: string, maxBytes?: number) => Promise<Uint8Array>
}

export function googleApi(
  _wantedAccount: string | undefined,
  _deps: GoogleTokenDeps = defaultGoogleTokenDeps
): GoogleApi {
  throw new Error('This service is not included in the internal edition.')
}
