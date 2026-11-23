import { createServer } from 'node:http'
import { connect } from 'node:net'
import { once } from 'node:events'
import { describe, expect, it } from 'vitest'
import './intranet-network'

describe('internal runtime network enforcement', () => {
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
