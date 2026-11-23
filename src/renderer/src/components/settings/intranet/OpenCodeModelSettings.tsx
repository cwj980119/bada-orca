import { useState, type ReactNode } from 'react'
import { createNonSecureContextUuid as createBrowserUuid } from '../../../../../shared/identifiers/non-secure-context-uuid'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { SettingsGroup } from '../section-layout/SettingsGroup'
import { SettingsRow } from '../form-controls/SettingsFormControls'
import { useTranslate } from '@/i18n/use-translate'
import type {
  IntranetSettings,
  IntranetOpenCodeModel
} from '../../../../../shared/intranet/intranet-settings'
import {
  intranetOpenCodeModels,
  intranetOpenCodeModelLabel
} from '../../../../../shared/intranet/intranet-opencode-models'

type ModelRow = IntranetOpenCodeModel & { key: string }

export function OpenCodeModelSettings({
  value,
  onChange,
  cli,
  discovery
}: {
  value: IntranetSettings['opencode']
  onChange: (value: IntranetSettings['opencode']) => void
  cli?: string
  discovery?: ReactNode
}): React.JSX.Element {
  const t = useTranslate()
  const [rows, setRows] = useState<ModelRow[]>(() =>
    intranetOpenCodeModels(value).map((model) => ({ ...model, key: createBrowserUuid() }))
  )
  const commit = (next: ModelRow[], defaultId = value.model): void => {
    setRows(next)
    onChange({
      ...value,
      models: next.map(({ key: _key, ...model }) => model),
      model: next.some((model) => model.id === defaultId) ? defaultId : (next[0]?.id ?? '')
    })
  }
  const edit = (key: string, field: keyof IntranetOpenCodeModel, text: string): void => {
    const old = rows.find((row) => row.key === key)
    commit(
      rows.map((row) => (row.key === key ? { ...row, [field]: text } : row)),
      field === 'id' && old?.id === value.model ? text : value.model
    )
  }
  const defaultKey = rows.find((row) => row.id === value.model)?.key ?? rows[0]?.key
  return (
    <SettingsGroup
      title={cli ?? 'OpenCode'}
      description={
        cli
          ? t(
              'intranet.cliModelsHelp',
              'Register company model IDs from this CLI’s existing configuration. Its server and credentials remain managed by the CLI.'
            )
          : t(
              'intranet.modelsDescription',
              'Register models with a name and purpose. Choose a model for each chat or worker from its model picker. Leave the server and list empty to use your existing CLI configuration.'
            )
      }
    >
      {discovery}
      {!cli ? (
        <>
          <SettingsRow
            label={t('intranet.commonBaseUrl', 'Common model server URL (optional)')}
            control={
              <Input
                aria-label={t('intranet.opencodeServerUrl', 'OpenCode server URL')}
                value={value.baseUrl}
                onChange={(event) => onChange({ ...value, baseUrl: event.target.value })}
                placeholder="http://llm.company.internal:8000/v1"
                className="w-80 max-w-full"
              />
            }
          />
          <SettingsRow
            label={t('intranet.apiKeyEnv', 'API key environment variable (optional)')}
            control={
              <Input
                aria-label={t(
                  'intranet.opencodeApiKeyEnv',
                  'OpenCode API key environment variable'
                )}
                value={value.apiKeyEnv}
                onChange={(event) => onChange({ ...value, apiKeyEnv: event.target.value })}
                placeholder="COMPANY_MODEL_API_KEY"
                className="w-80 max-w-full"
              />
            }
          />
          <SettingsRow
            label={t('intranet.configVersion', 'OpenCode configuration format')}
            control={
              <Select
                value={value.configVersion}
                onValueChange={(configVersion) =>
                  onChange({ ...value, configVersion: configVersion as 'v1' | 'v2' })
                }
              >
                <SelectTrigger
                  aria-label={t('intranet.configVersion', 'OpenCode configuration format')}
                  className="w-80 max-w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="v1">OpenCode 1.x</SelectItem>
                  <SelectItem value="v2">OpenCode 2.x</SelectItem>
                </SelectContent>
              </Select>
            }
          />
        </>
      ) : null}
      <div data-settings-row="" className="space-y-4 py-4">
        {!cli ? (
          <p className="text-settings-detail text-muted-foreground">
            {t(
              'intranet.modelIdsHelp',
              'With a common server URL, enter its API model IDs. Without one, enter provider/model references from your existing OpenCode configuration. Credentials remain with that CLI.'
            )}
          </p>
        ) : null}
        {rows.map((row, index) => (
          <div
            key={row.key}
            className="space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">
                {t('intranet.registeredModel', 'Model {{number}}', { number: index + 1 })}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t('intranet.removeModel', 'Remove model {{name}}', {
                  name: row.name || row.id || index + 1
                })}
                onClick={() => commit(rows.filter((entry) => entry.key !== row.key))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`${row.key}-name`}>{t('intranet.modelName', 'Display name')}</Label>
                <Input
                  id={`${row.key}-name`}
                  value={row.name}
                  onChange={(event) => edit(row.key, 'name', event.target.value)}
                  placeholder={t('intranet.nameExample', 'Coding model')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${row.key}-id`}>{t('intranet.model', 'Model ID')}</Label>
                <Input
                  id={`${row.key}-id`}
                  value={row.id}
                  onChange={(event) => edit(row.key, 'id', event.target.value)}
                  placeholder={value.baseUrl ? 'company-coder' : 'company/coder'}
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${row.key}-purpose`}>
                {t('intranet.modelPurpose', 'Purpose (optional)')}
              </Label>
              <Input
                id={`${row.key}-purpose`}
                value={row.purpose}
                onChange={(event) => edit(row.key, 'purpose', event.target.value)}
                placeholder={t('intranet.purposeExample', 'Coding, review, reasoning, fast tasks…')}
              />
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={rows.length >= 64}
          onClick={() =>
            commit([...rows, { key: createBrowserUuid(), id: '', name: '', purpose: '' }])
          }
        >
          <Plus className="size-4" />
          {t('intranet.addModel', 'Add model')}
        </Button>
      </div>
      {rows.length ? (
        <SettingsRow
          label={t('intranet.defaultModel', 'Default model for new sessions')}
          control={
            <Select
              value={defaultKey}
              onValueChange={(key) =>
                onChange({ ...value, model: rows.find((row) => row.key === key)?.id ?? '' })
              }
            >
              <SelectTrigger
                aria-label={t('intranet.defaultModel', 'Default model for new sessions')}
                className="w-80 max-w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rows.map((row) => (
                  <SelectItem key={row.key} value={row.key}>
                    {intranetOpenCodeModelLabel(row) || t('intranet.unnamedModel', 'Unnamed model')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      ) : null}
    </SettingsGroup>
  )
}
