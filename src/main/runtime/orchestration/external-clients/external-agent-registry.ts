import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import type { OrchestrationDb } from '../db/orchestration-db'
import type { OrcaRuntimeService } from '../../orca-runtime'

const PublicClient = z.object({
  address: z.string(),
  agent: z.enum(['opencode', 'claude']),
  name: z.string(),
  cwd: z.string(),
  last_seen: z.number()
})
export type ExternalAgentClient = z.infer<typeof PublicClient>
export type ExternalAgentCredential = { address: string; token: string }
const registries = new WeakMap<OrchestrationDb, ExternalAgentRegistry>()
const LEASE_MS = 120_000

export class ExternalAgentRegistry {
  constructor(private readonly db: OrchestrationDb) {
    db.db.exec(`CREATE TABLE IF NOT EXISTS external_agent_clients (
      address TEXT PRIMARY KEY, token_hash TEXT NOT NULL, agent TEXT NOT NULL,
      name TEXT NOT NULL, cwd TEXT NOT NULL, last_seen INTEGER NOT NULL
    )`)
  }

  register(input: {
    agent: 'opencode' | 'claude'
    name: string
    cwd: string
  }): ExternalAgentCredential {
    const credential = {
      address: `external:${randomUUID()}`,
      token: randomBytes(32).toString('base64url')
    }
    this.db.db
      .prepare('INSERT INTO external_agent_clients VALUES (?, ?, ?, ?, ?, ?)')
      .run(
        credential.address,
        hash(credential.token),
        input.agent,
        input.name,
        input.cwd,
        Date.now()
      )
    return credential
  }

  authenticate(credential: ExternalAgentCredential): ExternalAgentClient {
    const row = this.db.db
      .prepare('SELECT * FROM external_agent_clients WHERE address = ?')
      .get(credential.address)
    const parsed = PublicClient.extend({ token_hash: z.string() }).safeParse(row)
    const expected = Buffer.from(parsed.success ? parsed.data.token_hash : '0'.repeat(64), 'hex')
    const valid =
      expected.length === 32 &&
      timingSafeEqual(expected, Buffer.from(hash(credential.token), 'hex'))
    if (!parsed.success || !valid) {
      throw new Error('Invalid external agent credential. Reconnect the Orca MCP server.')
    }
    this.db.db
      .prepare('UPDATE external_agent_clients SET last_seen = ? WHERE address = ?')
      .run(Date.now(), credential.address)
    return PublicClient.parse({ ...parsed.data, last_seen: Date.now() })
  }

  connected(address: string): boolean {
    const row = PublicClient.safeParse(
      this.db.db.prepare('SELECT * FROM external_agent_clients WHERE address = ?').get(address)
    )
    return row.success && row.data.last_seen > Date.now() - LEASE_MS
  }

  find(address: string): ExternalAgentClient | null {
    const parsed = PublicClient.safeParse(
      this.db.db
        .prepare(
          'SELECT address, agent, name, cwd, last_seen FROM external_agent_clients WHERE address = ?'
        )
        .get(address)
    )
    return parsed.success ? parsed.data : null
  }

  list(limit = -1): ExternalAgentClient[] {
    return z
      .array(PublicClient)
      .parse(
        this.db.db
          .prepare(
            'SELECT address, agent, name, cwd, last_seen FROM external_agent_clients WHERE last_seen > ? ORDER BY name, address LIMIT ?'
          )
          .all(Date.now() - LEASE_MS, limit)
      )
  }

  disconnect(credential: ExternalAgentCredential): void {
    this.authenticate(credential)
    this.db.db
      .prepare('UPDATE external_agent_clients SET last_seen = 0 WHERE address = ?')
      .run(credential.address)
  }
}

function hash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function externalAgents(
  runtime: Pick<OrcaRuntimeService, 'getOrchestrationDb'>
): ExternalAgentRegistry {
  const db = runtime.getOrchestrationDb()
  let registry = registries.get(db)
  if (!registry) {
    registry = new ExternalAgentRegistry(db)
    registries.set(db, registry)
  }
  return registry
}

export function isExternalAgentMailbox(
  runtime: Pick<OrcaRuntimeService, 'getOrchestrationDb'>,
  address: string
): boolean {
  return address.startsWith('external:') && externalAgents(runtime).connected(address)
}
