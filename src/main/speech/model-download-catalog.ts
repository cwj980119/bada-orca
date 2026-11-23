import type { SpeechModelDownloadFile, SpeechModelManifest } from '../../shared/speech/speech-types'
export type DownloadableSpeechModelId =
  | 'parakeet-tdt-0.6b-v3-int8'
  | 'parakeet-tdt-0.6b-v2-int8'
  | 'zipformer-bilingual-zh-en'
  | 'paraformer-bilingual-zh-en'
  | 'zipformer-streaming-en-20m'
  | 'zipformer-streaming-zh-14m'
  | 'zipformer-streaming-korean'
  | 'parakeet-tdt-ctc-0.6b-ja-int8'
  | 'whisper-tiny'
  | 'sense-voice-zh-en-ja-ko-yue'
export type SpeechModelDownload = Pick<
  SpeechModelManifest,
  'id' | 'provider' | 'downloadFiles' | 'legacyDownloadFiles' | 'sizeBytes'
>
export const SILERO_VAD_MODEL = {
  id: 'silero-vad-v6.2',
  provider: 'local',
  downloadFiles: [] as SpeechModelDownloadFile[],
  sizeBytes: 0
} satisfies SpeechModelDownload
export function getSpeechModelDownloadMetadata(_modelId: DownloadableSpeechModelId): {
  downloadFiles: SpeechModelDownloadFile[]
  files: string[]
  sizeBytes: number
} {
  return { downloadFiles: [], files: [], sizeBytes: 0 }
}
