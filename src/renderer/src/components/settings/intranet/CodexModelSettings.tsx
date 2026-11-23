import { useState } from 'react'
import { OpenCodeModelSettings } from './OpenCodeModelSettings'
import { LocalCodexModelDiscovery, type CodexModelRegistration } from './LocalCodexModelDiscovery'

export function CodexModelSettings({
  value,
  onChange
}: {
  value: CodexModelRegistration
  onChange: (value: CodexModelRegistration) => void
}): React.JSX.Element {
  const [importRevision, setImportRevision] = useState(0)
  return (
    <OpenCodeModelSettings
      key={importRevision}
      cli="Codex"
      value={{ ...value, baseUrl: '', apiKeyEnv: '', configVersion: 'v1' }}
      onChange={({ model, models }) => onChange({ model, models })}
      discovery={
        <LocalCodexModelDiscovery
          value={value}
          onImport={(next) => {
            onChange(next)
            setImportRevision((current) => current + 1)
          }}
        />
      }
    />
  )
}
