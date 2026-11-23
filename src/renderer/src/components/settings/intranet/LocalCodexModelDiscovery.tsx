import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useTranslate } from '@/i18n/use-translate'
import { callRuntimeRpc } from '@/runtime/rpc/calls/runtime-rpc-call'
import type { LocalCodexModels } from '../../../../../shared/intranet/intranet-codex-models'
import type { IntranetOpenCodeModel } from '../../../../../shared/intranet/intranet-settings'

export type CodexModelRegistration = { model: string; models: IntranetOpenCodeModel[] }

export function LocalCodexModelDiscovery({
  value,
  onImport
}: {
  value: CodexModelRegistration
  onImport: (value: CodexModelRegistration) => void
}): React.JSX.Element {
  const t = useTranslate()
  const [result, setResult] = useState<LocalCodexModels | null>(null)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    void callRuntimeRpc<LocalCodexModels>({ kind: 'local' }, 'intranet.codexModels', undefined, {
      signal: controller.signal
    }).then(
      (discovered) => {
        if (!controller.signal.aborted) {
          setResult(discovered)
          setSelected(new Set(discovered.defaultModel ? [discovered.defaultModel] : []))
          setLoading(false)
          setFailed(false)
        }
      },
      () => {
        if (!controller.signal.aborted) {
          setFailed(true)
          setLoading(false)
        }
      }
    )
    return () => controller.abort()
  }, [revision])
  const registered = new Set(value.models.map((model) => model.id))
  const additions =
    result?.models.filter((model) => selected.has(model.id) && !registered.has(model.id)) ?? []
  const room = Math.max(0, 64 - value.models.length)
  const apply = (): void => {
    const models = [
      ...value.models,
      ...additions.slice(0, room).map(({ id, name }) => ({ id, name, purpose: '' }))
    ]
    const model =
      value.model ||
      (result?.defaultModel && models.some((entry) => entry.id === result.defaultModel)
        ? result.defaultModel
        : models[0]?.id) ||
      ''
    onImport({ model, models })
  }
  return (
    <div data-settings-row="" className="space-y-3 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">
          {t('intranet.codexDetection.title', 'Detect local Codex models')}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => {
            setLoading(true)
            setFailed(false)
            setRevision((current) => current + 1)
          }}
        >
          {loading
            ? t('intranet.codexDetection.loading', 'Detecting…')
            : t('intranet.bots.rescan', 'Scan again')}
        </Button>
      </div>
      <p role="status" className="text-settings-detail text-muted-foreground">
        {loading
          ? t('intranet.codexDetection.loading', 'Detecting…')
          : failed
            ? t(
                'intranet.codexDetection.failed',
                'Could not read local Codex models. Check the CLI configuration and try again.'
              )
            : result?.models.length
              ? t(
                  'intranet.codexDetection.found',
                  'Found {{count}} models in local configuration and cache.',
                  { count: result.models.length }
                )
              : t(
                  'intranet.codexDetection.empty',
                  'No models were found in local configuration or cache. You can register model IDs below.'
                )}
      </p>
      {!loading && result?.models.length ? (
        <>
          <div className="max-h-56 space-y-2 overflow-y-auto scrollbar-sleek">
            {result.models.map((model) => (
              <label key={model.id} className="flex items-start gap-2 text-sm">
                <Checkbox
                  className="mt-0.5"
                  checked={registered.has(model.id) || selected.has(model.id)}
                  disabled={
                    registered.has(model.id) ||
                    (!selected.has(model.id) && additions.length >= room)
                  }
                  onCheckedChange={(checked) =>
                    setSelected((current) => {
                      const next = new Set(current)
                      if (checked === true) {
                        next.add(model.id)
                      } else {
                        next.delete(model.id)
                      }
                      return next
                    })
                  }
                />
                <span className="min-w-0 break-words">
                  {model.name || model.id}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {model.source === 'configuration'
                      ? t('intranet.codexDetection.configuration', 'Configuration')
                      : t('intranet.codexDetection.cache', 'Cache')}
                    {model.id === result.defaultModel
                      ? ` · ${t('intranet.codexDetection.default', 'Configuration default')}`
                      : ''}
                  </span>
                  {model.name && model.name !== model.id ? (
                    <code className="block text-xs text-muted-foreground">{model.id}</code>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!additions.length || room === 0}
            onClick={apply}
          >
            {t('intranet.codexDetection.import', 'Add selected models ({{count}})', {
              count: Math.min(additions.length, room)
            })}
          </Button>
        </>
      ) : null}
      <p className="text-settings-detail text-muted-foreground">
        {t(
          'intranet.codexDetection.help',
          'Reads the selected Codex home’s configuration and model cache without starting the CLI or contacting a model server. Choose models allowed by your company, add them, then save connections. Cached entries do not confirm current access; server and credentials remain configured in the CLI.'
        )}
      </p>
      {!loading && result?.issues.length ? (
        <p className="text-settings-detail text-muted-foreground">
          {result.issues.includes('provider-cache-skipped')
            ? t(
                'intranet.codexDetection.providerCacheSkipped',
                'This CLI uses a custom provider. Only its configured models are shown because the cache may belong to another provider.'
              )
            : t(
                'intranet.codexDetection.partial',
                'Some local files could not be read. Detected entries are still shown; model IDs can also be entered manually.'
              )}
        </p>
      ) : null}
    </div>
  )
}
