import { getHostDisplayLabelOverrides } from '../../../../shared/execution-host/host-setting-overrides'
import type { GlobalSettings } from '../../../../shared/settings/global-settings-types'
import type { RuntimeHostDisplayLabelOverrides } from './runtime-client-settings-shape'

export function runtimeClientHostLabels(
  settings: Pick<GlobalSettings, 'hostSettingOverrides'>
): RuntimeHostDisplayLabelOverrides {
  return Object.fromEntries(
    [...getHostDisplayLabelOverrides(settings)].map(([hostId, displayLabel]) => [
      hostId,
      { displayLabel }
    ])
  ) as RuntimeHostDisplayLabelOverrides
}
