import { defineFixture } from '../../../component-fixtures/component-fixture'
import { IntranetSettingsPane } from './IntranetSettingsPane'
import { OpenCodeModelSettings } from './OpenCodeModelSettings'
import { INTRANET_MCP_SETTINGS_TARGET_ID } from '../navigation/settings-navigation-types'

export const mcpShortcut = defineFixture({
  width: 720,
  render: () => (
    <div className="settings-view-shell h-[840px] overflow-y-auto scrollbar-sleek bg-background p-8">
      <IntranetSettingsPane settings={undefined} save={async () => undefined} />
    </div>
  ),
  interact: () => {
    document
      .querySelector<HTMLAnchorElement>(`a[href="#${INTRANET_MCP_SETTINGS_TARGET_ID}"]`)
      ?.click()
  }
})

export const codex = defineFixture({
  width: 720,
  render: () => (
    <div className="settings-view-shell bg-background p-8">
      <OpenCodeModelSettings
        cli="Codex"
        value={{
          baseUrl: '',
          configVersion: 'v1',
          apiKeyEnv: '',
          model: 'company-coder',
          models: [
            { id: 'company-coder', name: '사내 코딩 모델', purpose: '코딩·구현' },
            { id: 'company-review', name: '사내 검토 모델', purpose: '설계·리뷰' }
          ]
        }}
        onChange={() => {}}
      />
    </div>
  )
})

export const empty = defineFixture({
  width: 720,
  render: () => (
    <div className="settings-view-shell bg-background p-8">
      <IntranetSettingsPane settings={undefined} save={async () => undefined} />
    </div>
  )
})

export const configured = defineFixture({
  width: 720,
  render: () => (
    <div className="settings-view-shell bg-background p-8">
      <IntranetSettingsPane
        settings={{
          allowedHosts: ['git.company.internal', '10.20.0.0/16'],
          opencode: {
            baseUrl: 'http://llm.company.internal:8000/v1',
            model: 'qwen-internal',
            models: [
              { id: 'qwen-internal', name: 'Qwen Coder', purpose: '코딩·구현' },
              { id: 'reasoning-internal', name: 'Reasoner', purpose: '설계·리뷰' }
            ],
            configVersion: 'v1'
          },
          claude: { baseUrl: 'http://gateway.company.internal:8000', model: 'company-model' }
        }}
        save={async () => undefined}
      />
    </div>
  )
})
