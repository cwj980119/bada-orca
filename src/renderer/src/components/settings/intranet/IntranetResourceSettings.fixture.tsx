import { useState } from 'react'
import { defineFixture } from '../../../component-fixtures/component-fixture'
import { defaultIntranetSettings } from '../../../../../shared/intranet/intranet-settings'
import { IntranetResourceSettings } from './IntranetResourceSettings'
import type { IntranetResources } from '../../../../../shared/intranet/intranet-resources'

const resources: IntranetResources = {
  bridgeCommand: 'orca',
  mcpServers: [
    {
      id: 'company-search',
      name: '사내 지식 검색',
      purpose: 'knowledge',
      transport: 'http',
      enabled: true,
      url: 'https://knowledge.company.internal/mcp',
      tokenEnv: 'COMPANY_KNOWLEDGE_TOKEN',
      command: '',
      args: []
    },
    {
      id: 'company-tools',
      name: '사내 업무 도구',
      purpose: 'tools',
      transport: 'stdio',
      enabled: true,
      url: '',
      tokenEnv: '',
      command: 'company-mcp',
      args: ['--profile', 'internal']
    }
  ],
  sources: [
    {
      id: 'team-skills',
      name: '팀 공통 스킬',
      kind: 'skills',
      enabled: true,
      path: '/srv/company/skills'
    },
    {
      id: 'team-docs',
      name: '업무 가이드',
      kind: 'knowledge',
      enabled: true,
      path: '/srv/company/docs'
    }
  ]
}

function Preview({ configured = false }: { configured?: boolean }): React.JSX.Element {
  const [settings, setSettings] = useState(() => ({
    ...defaultIntranetSettings(),
    ...(configured ? { resources } : {})
  }))
  return (
    <div className="settings-view-shell space-y-8 bg-background p-8">
      <IntranetResourceSettings
        settings={settings}
        onChange={(resources) => setSettings((current) => ({ ...current, resources }))}
      />
    </div>
  )
}

export const configured = defineFixture({ width: 720, render: () => <Preview configured /> })
export const empty = defineFixture({ width: 720, render: () => <Preview /> })
