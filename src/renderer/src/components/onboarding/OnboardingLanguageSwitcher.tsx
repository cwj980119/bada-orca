import { useRef } from 'react'
import { Languages } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { LanguagePickerDialog } from '@/components/languages/LanguagePickerDialog'
import { currentFocusTarget, firstConnected } from '@/components/languages/focus-return'
import type { OnboardingLanguageOffer } from './use-onboarding-language-offer'

export function OnboardingLanguageSwitcherButton({
  offer,
  onOpen,
  buttonRef
}: {
  offer: OnboardingLanguageOffer | null
  onOpen: () => void
  buttonRef?: React.Ref<HTMLButtonElement>
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <Button ref={buttonRef} variant="ghost" size="sm" onClick={onOpen}>
      <Languages />
      {/* Why a span: Button is flex with a gap, which would split the label's text runs. */}
      <span>
        {t('languages.label', 'Language')}
        {offer ? (
          <>
            {' · '}
            <bdi lang={offer.locale}>{offer.name}</bdi>
          </>
        ) : null}
      </span>
    </Button>
  )
}

export function OnboardingLanguageSwitcher({
  offer,
  open,
  onOpenChange
}: {
  offer: OnboardingLanguageOffer | null
  open: boolean
  onOpenChange: (open: boolean) => void
}): React.JSX.Element {
  const opener = useRef<HTMLElement | null>(null)
  const languageButton = useRef<HTMLButtonElement | null>(null)
  return (
    <>
      <OnboardingLanguageSwitcherButton
        offer={offer}
        buttonRef={languageButton}
        onOpen={() => {
          opener.current = currentFocusTarget()
          onOpenChange(true)
        }}
      />
      <LanguagePickerDialog
        open={open}
        onOpenChange={onOpenChange}
        onboarding
        returnFocus={() => firstConnected(opener.current, languageButton.current)}
      />
    </>
  )
}
