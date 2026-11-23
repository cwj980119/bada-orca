import { translate } from '@/i18n/i18n'
import type { Translate } from '@/i18n/use-translate'
import { browserSessionProfileLabel } from '../../../../../shared/browser/profiles/browser-session-profile-label'

/** Display-time label for the built-in default browser session profile. */
export function translateBrowserSessionProfileLabel(
  label: string | null | undefined,
  profileId?: string | null,
  t: Translate = translate
): string {
  return browserSessionProfileLabel(
    label,
    profileId,
    t('auto.components.settings.BrowserPane.4399c77caa', 'Default')
  )
}
