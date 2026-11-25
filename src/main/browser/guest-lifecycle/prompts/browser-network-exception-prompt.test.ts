import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BrowserPagePromptRequest } from '../../../../shared/browser/prompts/browser-page-prompt'
import { defaultIntranetSettings } from '../../../../shared/intranet/intranet-settings'
import { configureIntranetNetwork } from '../../../network/intranet-network'
import { BrowserCertificateRequestGuard } from '../../certificate-trust/browser-certificate-request-guard'
import { configureBrowserNetworkExceptions } from './browser-network-exception-prompt'
import { cancelBrowserPagePrompts, respondToBrowserPagePrompt } from './browser-page-prompts'

describe('browser network exception approval', () => {
  let settings = defaultIntranetSettings()
  let listener: Parameters<Electron.WebRequest['onBeforeRequest']>[0]
  let requests: BrowserPagePromptRequest<'network-exception'>[]
  let renderer: Electron.WebContents
  let requester: Electron.WebContents
  let session: Electron.Session
  let guard: BrowserCertificateRequestGuard
  let saveError: Error | null

  beforeEach(() => {
    settings = defaultIntranetSettings()
    requests = []
    saveError = null
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the request guard only uses this session's onBeforeRequest listener.
    session = {
      webRequest: {
        onBeforeRequest: (next: typeof listener) => {
          listener = next
        }
      }
    } as unknown as Electron.Session
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: page prompts use only the renderer's id, send and lifecycle events.
    renderer = Object.assign(new EventEmitter(), {
      id: 10,
      isDestroyed: () => false,
      send: (channel: string, request: BrowserPagePromptRequest<'network-exception'>) => {
        if (channel === 'browser:page-prompt-requested') {
          requests.push(request)
        }
      }
    }) as unknown as Electron.WebContents
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: page prompts use only this guest's session, id, URL and lifecycle events.
    requester = Object.assign(new EventEmitter(), {
      id: 11,
      session,
      getURL: () => 'https://page.example/',
      isDestroyed: () => false
    }) as unknown as Electron.WebContents
    configureIntranetNetwork(() => settings)
    configureBrowserNetworkExceptions({
      readSettings: () => settings,
      saveSettings: (next) => {
        if (saveError) {
          throw saveError
        }
        settings = next
      },
      resolveRequester: (id) => (id === requester.id ? requester : null),
      resolveTarget: () => ({ browserPageId: 'page-1', renderer })
    })
    guard = new BrowserCertificateRequestGuard({ onBlockedMainFrame: () => {} })
    guard.installSession(session)
  })

  afterEach(() => {
    cancelBrowserPagePrompts('page-1')
    requester.emit('destroyed')
    configureBrowserNetworkExceptions(null)
    configureIntranetNetwork(defaultIntranetSettings)
  })

  function request(url: string, method = 'POST') {
    const callback = vi.fn()
    listener?.(
      {
        id: 1,
        url,
        method,
        webContentsId: requester.id,
        resourceType: 'xhr',
        referrer: '',
        timestamp: 1,
        uploadData: []
      },
      callback
    )
    return callback
  }

  function answer(value: unknown) {
    const prompt = requests.at(-1)
    if (!prompt) {
      throw new Error('Expected network exception prompt')
    }
    return respondToBrowserPagePrompt(renderer, { requestId: prompt.requestId, answer: value })
  }

  it('keeps private networks, BADA and public page reads working without an exception', () => {
    expect(request('http://10.20.30.40/upload')).toHaveBeenCalledWith({})
    expect(request('https://bada.samsungsdi.com/api/upload')).toHaveBeenCalledWith({})
    expect(request('https://public.example/page', 'GET')).toHaveBeenCalledWith({})
    expect(requests).toEqual([])
  })

  it('holds uploads until approval, saves only the destination host and resumes the original requests', async () => {
    const upload = request('https://uploads.example.com:8443/api?token=private')
    const otherUpload = request('https://uploads.example.com/another')
    expect(upload).not.toHaveBeenCalled()
    expect(requests[0].details).toEqual({
      origin: 'https://uploads.example.com:8443',
      hostname: 'uploads.example.com'
    })
    settings = { ...settings, allowedHosts: ['internal.example'] }
    expect(await answer('allow')).toBe('answered')
    expect(settings.allowedHosts).toEqual(['internal.example', 'uploads.example.com'])
    expect(upload).toHaveBeenCalledWith({})
    expect(otherUpload).toHaveBeenCalledWith({})
    expect(request('https://uploads.example.com/new')).toHaveBeenCalledWith({})
  })

  it('keeps an upload blocked when the user declines', async () => {
    const upload = request('https://uploads.example.com/upload')
    await answer(null)
    expect(upload).toHaveBeenCalledWith({ cancel: true })
    expect(settings.allowedHosts).toEqual([])
  })

  it('cancels the upload if saving the exception fails', async () => {
    saveError = new Error('Settings are read-only')
    const upload = request('https://uploads.example.com/upload')
    expect(await answer('allow')).toBe('failed')
    expect(upload).toHaveBeenCalledWith({ cancel: true })
    expect(settings.allowedHosts).toEqual([])
  })

  it('cannot grant an exception after the browser session is retired', async () => {
    const upload = request('https://uploads.example.com/upload')
    guard.removeSession(session)
    await answer('allow')
    expect(upload).toHaveBeenCalledWith({ cancel: true })
    expect(settings.allowedHosts).toEqual([])
  })
})
