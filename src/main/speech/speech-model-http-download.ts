import type { DownloadTotals, OpenSpeechDownloadRequest } from './speech-model-download-response'

export abstract class SpeechModelHttpDownload {
  constructor(_openRequest: OpenSpeechDownloadRequest) {}

  protected abstract reportDownloadProgress(modelId: string, progress: number): void

  protected downloadFile(
    _url: string,
    _dest: string,
    _expectedSize: number,
    _modelId: string,
    _isAborted: () => boolean,
    _signal?: AbortSignal,
    _redirectCount = 0,
    _resumeOffset = 0,
    _totals?: DownloadTotals
  ): Promise<void> {
    throw new Error('This service is not included in the internal edition.')
  }
}
