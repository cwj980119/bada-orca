import type { SpeechModelProvider } from '../../shared/speech/speech-types'

export type CloudTranscriptionTarget = {
  url: string
  model: string

  apiKey: string

  label: string
}

export function hasCloudSpeechCredentials(_provider: SpeechModelProvider): boolean {
  throw new Error('This service is not included in the internal edition.')
}

export function canReadCloudSpeechCredentials(_provider: SpeechModelProvider): boolean {
  throw new Error('This service is not included in the internal edition.')
}

export function resolveCloudTranscriptionTarget(_modelId: string): CloudTranscriptionTarget {
  throw new Error('This service is not included in the internal edition.')
}
