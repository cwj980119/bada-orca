import type { CloudTranscriptionTarget } from './cloud-transcription-target'

export type OpenAiTranscriptionResponse = {
  text?: unknown
  error?: {
    message?: unknown
  }
}

export function sanitizeOpenAiTranscriptionErrorMessage(_message: string, _apiKey = ''): string {
  throw new Error('This service is not included in the internal edition.')
}

export function postOpenAiTranscription(
  _url: string,
  _apiKey: string,
  _form: FormData,
  _signal: AbortSignal
): Promise<Response> {
  throw new Error('This service is not included in the internal edition.')
}

export function readOpenAiErrorMessage(
  _data: OpenAiTranscriptionResponse,
  _apiKey = ''
): string | undefined {
  throw new Error('This service is not included in the internal edition.')
}

export class OpenAiTranscriptionSession {
  constructor(_readTarget: () => CloudTranscriptionTarget, _language?: string) {}

  cancel(): void {}

  feedAudio(_samples: Float32Array, _sampleRate: number): boolean {
    return false
  }

  async finish(): Promise<string> {
    throw new Error('This service is not included in the internal edition.')
  }
}
