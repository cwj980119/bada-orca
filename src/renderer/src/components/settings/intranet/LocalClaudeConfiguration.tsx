import { useEffect, useState } from 'react'
import { Button } from '../../ui/button'
import { SettingsGroup } from '../section-layout/SettingsGroup'
import { useTranslate } from '@/i18n/use-translate'
import { callRuntimeRpc } from '@/runtime/rpc/calls/runtime-rpc-call'
import type { LocalClaudeConfiguration as Configuration } from '../../../../../shared/intranet/local-claude-configuration'

export function LocalClaudeConfiguration(): React.JSX.Element {
  const t = useTranslate()
  const [configuration, setConfiguration] = useState<Configuration | null>(null)
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let disposed = false
    setLoading(true)
    setFailed(false)
    void callRuntimeRpc<Configuration>({ kind: 'local' }, 'intranet.claudeConfiguration', undefined)
      .then((value) => {
        if (!disposed) {
          setConfiguration(value)
        }
      })
      .catch(() => {
        if (!disposed) {
          setConfiguration(null)
          setFailed(true)
        }
      })
      .finally(() => {
        if (!disposed) {
          setLoading(false)
        }
      })
    return () => {
      disposed = true
    }
  }, [revision])
  return (
    <SettingsGroup
      title={t('intranet.claudeLocal.title', 'Claude Code')}
      description={t(
        'intranet.claudeLocal.description',
        'Reference the installed Claude Code settings.json directly, including its model, environment, authentication helpers and other settings. No separate Claude server or model registration is required.'
      )}
    >
      <div data-settings-row="" className="space-y-2 py-4 text-settings-detail">
        {configuration ? (
          <>
            <p className="break-all font-mono">{configuration.settingsFile}</p>
            <p className="text-muted-foreground">
              {configuration.exists
                ? t(
                    'intranet.claudeLocal.found',
                    'Settings file found. New Claude sessions reference this file.'
                  )
                : t(
                    'intranet.claudeLocal.missing',
                    'No settings.json was found at this path. Check the Claude configuration directory in agent settings.'
                  )}
            </p>
            {configuration.configuredModel ? (
              <p>
                {t('intranet.claudeLocal.model', 'Configured model: {{model}}', {
                  model: configuration.configuredModel
                })}
              </p>
            ) : null}
          </>
        ) : null}
        {failed ? (
          <p role="alert" className="text-destructive">
            {t(
              'intranet.claudeLocal.failed',
              'Could not read the selected Claude settings. Check the configuration directory and JSON syntax. Configuration contents are not included in this error.'
            )}
          </p>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => setRevision((value) => value + 1)}
        >
          {loading
            ? t('intranet.claudeLocal.loading', 'Checking settings…')
            : t('intranet.claudeLocal.refresh', 'Check settings again')}
        </Button>
      </div>
    </SettingsGroup>
  )
}
