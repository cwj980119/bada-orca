// @vitest-environment happy-dom
import { act } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { i18n, loadRendererUiLanguage } from './i18n'
import { TranslationScopeProvider } from './translation-scope-provider'
import { useTranslate } from './use-translate'

afterEach(async () => {
  cleanup()
  await i18n.changeLanguage('en')
  i18n.removeResourceBundle('ko', 'translation')
  vi.unstubAllGlobals()
})

it('refreshes mounted consumers without changing language or accepting an older pending catalog', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  i18n.addResourceBundle('ko', 'translation', { reloadProbe: 'cached' })
  await i18n.changeLanguage('ko')
  function Probe(): React.JSX.Element {
    const t = useTranslate()
    return <p>{t('reloadProbe', 'fallback')}</p>
  }
  render(
    <TranslationScopeProvider>
      <Probe />
    </TranslationScopeProvider>
  )
  expect(screen.getByText('cached')).toBeTruthy()

  let finishOlderRequest: (response: Response) => void = () => {}
  vi.stubGlobal('fetch', () => new Promise<Response>((resolve) => (finishOlderRequest = resolve)))
  const older = loadRendererUiLanguage('ko', { reload: true })
  vi.stubGlobal('fetch', async () => Response.json({ reloadProbe: 'fresh' }))
  await act(async () => {
    await loadRendererUiLanguage('ko', { reload: true })
  })
  expect(screen.getByText('fresh')).toBeTruthy()
  expect(i18n.language).toBe('ko')

  await act(async () => {
    finishOlderRequest(Response.json({ reloadProbe: 'obsolete' }))
    await older
  })
  expect(screen.getByText('fresh')).toBeTruthy()
  expect(i18n.language).toBe('ko')
})
