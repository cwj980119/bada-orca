import type { z } from 'zod'
import type { ConnectorRequest, ConnectorResult } from './connector-cloud-request'

export type ConnectorToken = { connectorToken: string; expiresAt: number }

export type ConnectorTokenMint = () => Promise<ConnectorResult<ConnectorToken>>

export type ConnectorCallObserver = {
  callStarted(): void
  callSettled(): void

  requestStarted(renewal: boolean): void
  requestSettled(status: number | 'network' | 'aborted'): void

  noRequest(reason: 'token'): void
}

export type ConnectorCallOptions = Pick<ConnectorRequest, 'method' | 'timeoutMs' | 'signal'> & {
  requests?: ConnectorCallObserver | undefined
}

export class ConnectorAccountTransport {
  constructor(
    _origin: string,
    _mint: ConnectorTokenMint,
    _fetchImpl: typeof globalThis.fetch = globalThis.fetch,
    _now: () => number = Date.now
  ) {}

  async call<TSchema extends z.ZodType>(
    _path: string,
    _body: unknown,
    _schema: TSchema,
    _options: ConnectorCallOptions = {}
  ): Promise<ConnectorResult<z.infer<TSchema>>> {
    throw new Error('This service is not included in the internal edition.')
  }
}
