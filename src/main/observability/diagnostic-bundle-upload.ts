export type UploadBundleOptions = {
  readonly tokenEndpoint: string
  readonly payload: string
  readonly bundleSubmissionId: string
}

export type UploadBundleResult = {
  readonly ticketId: string
}

export type DeleteBundleOptions = {
  readonly tokenEndpoint: string
  readonly ticketId: string
}

export async function uploadBundle(_opts: UploadBundleOptions): Promise<UploadBundleResult> {
  throw new Error('This service is not included in the internal edition.')
}

export async function deleteBundle(_opts: DeleteBundleOptions): Promise<void> {
  throw new Error('This service is not included in the internal edition.')
}

export function validateUploadUrl(_uploadUrl: string, _tokenEndpoint: string): void {
  throw new Error('This service is not included in the internal edition.')
}
