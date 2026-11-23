import { defineFixture } from '../../../component-fixtures/component-fixture'
import { CodexModelSettings } from './CodexModelSettings'
import type { LocalCodexModels } from '../../../../../shared/intranet/intranet-codex-models'

const detected: LocalCodexModels = {
  defaultModel: 'company-coder',
  cacheUpdatedAt: null,
  issues: [],
  models: [
    { id: 'company-coder', name: '', source: 'configuration' },
    { id: 'company-review', name: '사내 검토 모델', source: 'cache' }
  ]
}

export const detectedModels = defineFixture({
  width: 720,
  setup: () => {
    const runtime = window.api.runtime
    Reflect.set(window.api, 'runtime', {
      ...runtime,
      call: async (input: { method: string }) =>
        input.method === 'intranet.codexModels'
          ? { ok: true, result: detected }
          : { ok: false, error: { code: 'runtime_error', message: input.method } }
    })
  },
  render: () => (
    <div className="settings-view-shell bg-background p-8">
      <CodexModelSettings value={{ model: '', models: [] }} onChange={() => {}} />
    </div>
  )
})
