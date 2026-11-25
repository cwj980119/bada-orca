import { createServer } from 'node:http'
import {
  connect,
  createServer as createTcpServer,
  type Socket,
  type TcpNetConnectOpts
} from 'node:net'
import { once } from 'node:events'
import { describe, expect, it } from 'vitest'
import { configureIntranetNetwork, connectBrowserSocket } from './intranet-network'
import { defaultIntranetSettings } from '../../shared/intranet/intranet-settings'

describe('internal runtime network enforcement', () => {
  it('opens browser transports without granting ordinary app sockets the same exception', async () => {
    const sockets = new Set<Socket>()
    const server = createTcpServer((socket) => {
      sockets.add(socket)
      socket.pipe(socket)
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    try {
      const address = server.address()
      if (!address || typeof address === 'string') {
        throw new Error('Missing local service address')
      }
      const options: TcpNetConnectOpts = {
        host: 'public.example',
        port: address.port,
        autoSelectFamily: false,
        lookup: (_host, _options, callback) => callback(null, '127.0.0.1', 4)
      }
      const browser = connectBrowserSocket(options)
      sockets.add(browser)
      await once(browser, 'connect')
      browser.write('browser traffic')
      const [browserData] = await once(browser, 'data')
      expect(browserData.toString()).toBe('browser traffic')

      const blocked = connect(options)
      sockets.add(blocked)
      await expect(once(blocked, 'connect')).rejects.toThrow(
        'External socket connections are disabled'
      )

      configureIntranetNetwork(() => ({
        ...defaultIntranetSettings(),
        allowedHosts: ['public.example']
      }))
      const approved = connect(options)
      sockets.add(approved)
      await once(approved, 'connect')
      approved.write('private data for approved server')
      const [approvedData] = await once(approved, 'data')
      expect(approvedData.toString()).toBe('private data for approved server')
    } finally {
      configureIntranetNetwork(defaultIntranetSettings)
      sockets.forEach((socket) => socket.destroy())
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })

  it('keeps localhost HTTP working and blocks public HTTP and raw sockets', async () => {
    const server = createServer((request, response) => {
      if (request.url === '/redirect') {
        response.writeHead(302, { location: 'http://example.invalid/private-data' })
        response.end()
      } else {
        response.end('internal service')
      }
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    try {
      const address = server.address()
      if (!address || typeof address === 'string') {
        throw new Error('Missing local service address')
      }
      const response = await fetch(`http://127.0.0.1:${address.port}`)
      expect(await response.text()).toBe('internal service')
      await expect(fetch(`http://127.0.0.1:${address.port}/redirect`)).rejects.toThrow()
      await expect(fetch('https://github.com')).rejects.toThrow('External connections are disabled')
      const socket = connect({ host: 'example.invalid', port: 443 })
      await expect(once(socket, 'connect')).rejects.toThrow(
        'External socket connections are disabled'
      )
    } finally {
      server.closeAllConnections()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })
})
