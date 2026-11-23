import type WebSocket from 'ws'

import type { RpcTransport } from '../transport'

import type {
  MobileSocketTransport,
  MobileSocketTransportMetadata
} from '../mobile/mobile-socket-wiring'

export const RELAY_SOCKET_CLOSE_TIMEOUT_MS = 5_000

export type RelayConnectionOpen = {
  connId: string
  connTicket: string
  kind: 'invite' | 'resume'
  relayDeviceId: string
  attachDeadlineMs: number
}

type CloudRelayTransportOptions = {
  cellUrl: string
  relayHostId: string
  generation: number
  createSocket?: (url: string) => WebSocket
  onConnectionClosed?: (connectionId: string) => void

  onDataDialSettled?: (
    connectionId: string,
    openedAfterMs: number | null,
    attached: boolean
  ) => void
}

export class CloudRelayTransport implements RpcTransport, MobileSocketTransport {
  constructor(_options: CloudRelayTransportOptions) {}

  onMessage(_handler: Parameters<MobileSocketTransport['onMessage']>[0]): void {}

  onConnectionClose(_handler: Parameters<MobileSocketTransport['onConnectionClose']>[0]): void {}

  metadataFor(_ws: WebSocket): MobileSocketTransportMetadata {
    throw new Error('This service is not included in the internal edition.')
  }

  setClientId(_ws: WebSocket, _clientId: string): void {}

  setGeneration(_generation: number): void {}

  setDataOrigin(_cellUrl: string): void {}

  hasConnection(_connectionId: string): boolean {
    return false
  }

  terminateClientConnections(_clientId: string): number {
    return 0
  }

  async start(): Promise<void> {}

  async stop(): Promise<void> {}

  async openConnection(_connection: RelayConnectionOpen): Promise<void> {
    throw new Error('This service is not included in the internal edition.')
  }
}
