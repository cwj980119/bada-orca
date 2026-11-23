export const ORCA_REPO = 'stablyai/orca'

/** null means the star state could not be determined. */
export function checkOrcaStarred(): Promise<boolean | null> {
  return Promise.resolve(null)
}

/** @internal Drop any coalesced check so suites cannot inherit one another's. */
export function __resetOrcaStarCheckForTests(): void {}

export async function starOrca(): Promise<boolean> {
  return false
}
