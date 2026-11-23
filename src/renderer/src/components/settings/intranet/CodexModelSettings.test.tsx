// @vitest-environment happy-dom
import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { CodexModelRegistration } from './LocalCodexModelDiscovery'

vi.mock('@/runtime/rpc/calls/runtime-rpc-call', () => ({
  callRuntimeRpc: async () => ({
    defaultModel: 'company-coder',
    cacheUpdatedAt: null,
    issues: [],
    models: [
      { id: 'company-coder', name: 'Coder', source: 'configuration' },
      { id: 'company-review', name: 'Cached review', source: 'cache' }
    ]
  })
}))
vi.mock('@/i18n/use-translate', () => ({
  useTranslate: () => (_key: string, fallback: string) => fallback
}))
import { CodexModelSettings } from './CodexModelSettings'

afterEach(cleanup)

it('imports the detected selection into editable rows while preserving existing model labels and the default', async () => {
  const changed = vi.fn()
  function Form() {
    const [value, setValue] = useState<CodexModelRegistration>({
      model: 'company-review',
      models: [{ id: 'company-review', name: 'Saved review', purpose: 'Review' }]
    })
    return (
      <CodexModelSettings
        value={value}
        onChange={(next) => {
          changed(next)
          setValue(next)
        }}
      />
    )
  }
  render(<Form />)
  await screen.findAllByRole('checkbox')
  fireEvent.click(screen.getByRole('button', { name: /Add selected models/ }))
  expect(await screen.findByDisplayValue('company-coder')).toBeTruthy()
  expect(screen.getByDisplayValue('Saved review')).toBeTruthy()
  expect(changed).toHaveBeenLastCalledWith({
    model: 'company-review',
    models: [
      { id: 'company-review', name: 'Saved review', purpose: 'Review' },
      { id: 'company-coder', name: 'Coder', purpose: '' }
    ]
  })
})
