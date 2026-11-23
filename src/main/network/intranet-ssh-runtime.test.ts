import '../runtime/rpc/dispatch/testing/unused-default-rpc-methods.test-fixture'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createConnection, createServer, type Server as TcpServer } from 'node:net'
import { once } from 'node:events'
import { Client, Server as SshServer, utils, type Connection } from 'ssh2'
import { expect, it } from 'vitest'
import { OrcaRuntimeService } from '../runtime/orca-runtime'
import { OrcaRuntimeRpcServer } from '../runtime/rpc/server/runtime-rpc'
import { STATUS_METHODS } from '../runtime/rpc/methods/host-management/status'
import { parsePairingCode } from '../../shared/remote-runtime/pairing/pairing'
import { pairedRuntimeConnectionFromOffer } from '../../shared/remote-runtime/pairing/paired-runtime-connection'
import { sendRemoteRuntimeRequestOnSocket } from '../../shared/remote-runtime/requests/remote-runtime-request-socket'

function port(server: TcpServer): number {
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Missing listening address')
  }
  return address.port
}

it('serves authenticated runtime calls through SSH while keeping desktop and mobile access closed', async () => {
  const runtime = new OrcaRuntimeService()
  const rpc = new OrcaRuntimeRpcServer({
    runtime,
    methods: STATUS_METHODS,
    userDataPath: mkdtempSync(join(tmpdir(), 'orca-intranet-ssh-')),
    enableWebSocket: true,
    wsPort: 0,
    pinnedBindHost: '127.0.0.1',
    serveNetworkSources: { allowPublic: false, refusePublic: true, pairingAddress: null }
  })
  const ssh = new SshServer({
    hostKeys: [utils.generateKeyPairSync('ecdsa', { bits: 256 }).private]
  })
  const client = new Client()
  const connections = new Set<Connection>()
  const forwardedSockets = new Set<ReturnType<typeof createConnection>>()
  const forwarder = createServer((socket) => {
    forwardedSockets.add(socket)
    socket.on('error', () => {})
    socket.on('close', () => forwardedSockets.delete(socket))
    const destination = new URL(rpc.getWebSocketEndpoint()!)
    client.forwardOut('127.0.0.1', 0, '127.0.0.1', Number(destination.port), (error, stream) => {
      if (error) {
        socket.destroy(error)
        return
      }
      socket.pipe(stream).pipe(socket)
    })
  })
  ssh.on('connection', (connection) => {
    connections.add(connection)
    connection.on('error', () => {})
    connection.on('authentication', (context) => {
      if (context.method === 'password' && context.password === 'test-only') {
        context.accept()
      } else {
        context.reject()
      }
    })
    connection.on('tcpip', (accept, _reject, info) => {
      const socket = createConnection({ host: info.destIP, port: info.destPort })
      forwardedSockets.add(socket)
      socket.on('close', () => forwardedSockets.delete(socket))
      socket.on('error', () => {})
      const stream = accept()
      stream.pipe(socket).pipe(stream)
    })
  })
  try {
    await rpc.start()
    expect(rpc.getWebSocketEndpoint()).toMatch(/^ws:\/\/127\.0\.0\.1:/)
    expect(rpc.createPairingOffer({ scope: 'mobile' }).available).toBe(false)
    ssh.listen(0, '127.0.0.1')
    await once(ssh, 'listening')
    client.connect({
      host: '127.0.0.1',
      port: port(ssh),
      username: 'test',
      password: 'test-only',
      hostVerifier: () => true
    })
    await once(client, 'ready')
    forwarder.listen(0, '127.0.0.1')
    await once(forwarder, 'listening')
    const offer = rpc.createPairingOffer({
      name: 'SSH desktop',
      scope: 'runtime',
      reach: 'this-computer'
    })
    if (!offer.available) {
      throw new Error(offer.guidance)
    }
    const pairing = parsePairingCode(offer.pairingUrl)
    if (!pairing) {
      throw new Error('Invalid runtime credential')
    }
    const connection = pairedRuntimeConnectionFromOffer({
      ...pairing,
      endpoint: `ws://127.0.0.1:${port(forwarder)}`
    })
    const answer = await sendRemoteRuntimeRequestOnSocket<{ runtimeId: string }>(
      connection,
      'status.get',
      { probe: true },
      5000
    )
    expect(answer.ok && answer.result.runtimeId).toBe(runtime.getRuntimeId())
  } finally {
    for (const socket of forwardedSockets) {
      socket.destroy()
    }
    client.destroy()
    for (const connection of connections) {
      connection.end()
    }
    forwarder.close()
    ssh.close()
    await rpc.stop()
  }
  const desktop = new OrcaRuntimeRpcServer({
    runtime: new OrcaRuntimeService(),
    methods: [],
    userDataPath: mkdtempSync(join(tmpdir(), 'orca-intranet-desktop-')),
    enableWebSocket: true,
    wsPort: 0
  })
  try {
    await desktop.start()
    expect(desktop.getWebSocketEndpoint()).toBeNull()
  } finally {
    await desktop.stop()
  }
}, 15000)
