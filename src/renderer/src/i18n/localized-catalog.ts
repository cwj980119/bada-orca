import { i18n, translate } from './i18n'
import type { Translate } from './use-translate'
import { getTranslationResourceVersion } from './translation-resource-version'

export function createLocalizedCatalog<T>(builder: (t: Translate) => T): (t?: Translate) => T {
  let cachedLocale: string | undefined
  let cachedResourceVersion = -1
  let cachedValue: T | undefined
  let cachedTranslate: Translate | undefined

  return (t = translate) => {
    const resourceVersion = getTranslationResourceVersion()
    if (
      cachedLocale !== i18n.language ||
      cachedResourceVersion !== resourceVersion ||
      cachedValue === undefined ||
      cachedTranslate !== t
    ) {
      cachedValue = builder(t)
      cachedTranslate = t
      cachedLocale = i18n.language
      cachedResourceVersion = resourceVersion
    }
    return cachedValue
  }
}
