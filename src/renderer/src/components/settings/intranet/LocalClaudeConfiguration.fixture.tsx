import { defineFixture } from '../../../component-fixtures/component-fixture'
import { LocalClaudeConfiguration } from './LocalClaudeConfiguration'

export const referenced = defineFixture({
  width: 720,
  setup: () => {
    const runtime = window.api.runtime
    Reflect.set(window.api, 'runtime', {
      ...runtime,
      call: async (input: { method: string }) =>
        input.method === 'intranet.claudeConfiguration'
          ? {
              ok: true,
              result: {
                settingsFile: 'C:\\Users\\example\\.claude\\settings.json',
                exists: true,
                configuredModel: 'company-coder'
              }
            }
          : { ok: false, error: { code: 'runtime_error', message: input.method } }
    })
  },
  render: () => (
    <div className="settings-view-shell bg-background p-8">
      <LocalClaudeConfiguration />
    </div>
  )
})
