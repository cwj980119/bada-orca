import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'
import type { McpSecretReference } from '../../../../../../shared/intranet/intranet-mcp-auth'
import { McpSelectField, McpTextField } from './McpFormField'

export function McpSecretField({
  value,
  onChange,
  saved,
  busy,
  onSave,
  revision,
  label
}: {
  value: McpSecretReference
  onChange: (value: McpSecretReference) => void
  saved: boolean
  busy: boolean
  onSave: (secret: string) => Promise<boolean>
  revision: string
  label: string
}): React.JSX.Element {
  const t = useTranslate()
  const [secret, setSecret] = useState('')
  useEffect(() => {
    setSecret('')
  }, [revision])
  return (
    <div className="space-y-3">
      <McpSelectField
        label={t('intranet.mcp.secretSource', 'Credential source')}
        value={value.source}
        onChange={(source) => {
          setSecret('')
          onChange({ source: source as McpSecretReference['source'], env: value.env })
        }}
        options={[
          { value: 'stored', label: t('intranet.mcp.stored', 'Enter and store securely in Orca') },
          { value: 'env', label: t('intranet.mcp.environment', 'Host environment variable') }
        ]}
      />
      {value.source === 'env' ? (
        <McpTextField
          label={t('intranet.mcp.envName', 'Environment variable name')}
          value={value.env}
          onChange={(env) => onChange({ ...value, env })}
          placeholder="COMPANY_MCP_TOKEN"
        />
      ) : (
        <>
          <McpTextField
            label={label}
            value={secret}
            onChange={setSecret}
            type="password"
            placeholder={
              saved
                ? t('intranet.mcp.secretSaved', 'Saved securely. Enter a new value to replace.')
                : ''
            }
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy || !secret}
            onClick={async () => {
              if (await onSave(secret)) {
                setSecret('')
              }
            }}
          >
            {t('intranet.mcp.saveSecret', 'Store credential securely')}
          </Button>
        </>
      )}
    </div>
  )
}
