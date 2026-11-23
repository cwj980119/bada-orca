import type { OpenAiCompatibleSpeechProvider } from '../../shared/speech/speech-types'

export async function saveVerifiedOpenAiSpeechApiKey(_apiKey: string): Promise<void> {
  throw new Error('This service is not included in the internal edition.')
}

export async function saveVerifiedOpenAiCompatibleSpeechProvider(
  _input: OpenAiCompatibleSpeechProvider
): Promise<void> {
  throw new Error('This service is not included in the internal edition.')
}
