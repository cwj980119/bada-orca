import type {
  ConnectCurrentOrcaProfileResult,
  CreateCloudLinkedOrcaProfileArgs,
  CreateCloudLinkedOrcaProfileResult,
  OrcaProfileAuthStatus,
  RefreshCurrentOrcaProfileAuthResult,
  SelectOrcaProfileOrgResult,
  SignOutCurrentOrcaProfileResult
} from '../../shared/orca-profiles/orca-profiles'

import { ensureActiveOrcaProfile } from './profile-index-store'
import { getProfileUserDataPath } from './profile-storage-paths'

import type { OrcaCloudAuthConfig } from './cloud-auth/profile-cloud-auth-config'

import type { OrcaCloudAuthorizationCode } from './cloud-auth/profile-cloud-pkce'
import type { CloudSessionCommitGuards } from './cloud-session/profile-cloud-session-commit'
/** Side effects every account change must run, whichever caller (window or runtime RPC) made it. */
export type OrcaAccountLifecycleHooks = {
  /** After a sign-in, org change or capability refresh succeeds. */
  onAuthMutation?: () => void
  /** Before sign-out touches the network, so nothing keeps running as the old account. */
  onBeforeSignOut?: () => void
  onAfterSignOut?: () => void
}
export type OrcaAccountServicePorts = {
  /** Hosts without a browser (orcad) never start the loopback flow, so they pass a refusing opener. */
  openBrowser: (url: string) => Promise<void>
  userDataPath?: () => string
  hooks?: OrcaAccountLifecycleHooks
  /** Links other features made under an account; while they exist, only that account may be
   * signed in (D5). */
  accountBoundLinks?: AccountBoundLinks
}
export type AccountBoundLinks = {
  /** The profile whose links these are; an account change for any other profile is refused. */
  profileId: () => string | null
  /** Why `nextUserId` may not become the account, or null. A link with no recorded owner belongs
   * to `profileUserId`, the profile's current account. */
  refusal: (nextUserId: string, profileUserId: string | null) => string | null
  /** The accounts the links belong to and the bots that hold them, for a page that warns before a move. */
  holders?: (profileUserId: string | null) => {
    ownerUserIds: string[]
    botNames: string[]
  }
}
/** One Orca account per host; Electron-free so desktop and orcad share it. */
export class OrcaAccountService {
  private readonly userDataPath: () => string
  private readonly accountBoundLinks: AccountBoundLinks | undefined
  private readonly signOutListeners = new Set<() => void>()
  constructor(ports: OrcaAccountServicePorts) {
    this.userDataPath = ports.userDataPath ?? getProfileUserDataPath

    this.accountBoundLinks = ports.accountBoundLinks
  }
  getAuthStatus(): OrcaProfileAuthStatus {
    {
      return {
        activeProfileId: ensureActiveOrcaProfile(this.userDataPath()).profile.id,
        configured: false,
        state: 'local',
        persistence: 'none'
      }
    }
  }
  /** What a sign-in's approval page shows before it moves this host to another account: the
   *  account it was on, and who its bots' links belong to. */
  signInContext(): {
    previous: {
      userId: string
      email: string
    } | null
    links: {
      ownerUserIds: string[]
      botNames: string[]
    } | null
  } {
    const cloud = this.getAuthStatus().cloud
    const previous = cloud ? { userId: cloud.userId, email: cloud.email } : null
    const links = this.accountBoundLinks?.holders?.(previous?.userId ?? null) ?? null
    return { previous, links: links && links.ownerUserIds.length > 0 ? links : null }
  }
  async connect(): Promise<ConnectCurrentOrcaProfileResult> {
    {
      return { status: 'unconfigured', auth: this.getAuthStatus() }
    }
  }
  /** Finishes a sign-in whose browser leg ran on another device. */
  async signInWithCode(
    _config: OrcaCloudAuthConfig,
    _code: OrcaCloudAuthorizationCode,
    _guards: Pick<
      CloudSessionCommitGuards,
      'signal' | 'requireSealedStorage' | 'expectedLinkEpoch'
    > = {}
  ): Promise<ConnectCurrentOrcaProfileResult> {
    {
      return { status: 'unconfigured', auth: this.getAuthStatus() }
    }
  }
  /** `onCreated` runs before the account hooks, for per-profile setup the caller owns. */
  async createCloudLinked(
    _args: CreateCloudLinkedOrcaProfileArgs,
    _onCreated?: (profileId: string) => void
  ): Promise<CreateCloudLinkedOrcaProfileResult> {
    {
      return { status: 'unconfigured', auth: this.getAuthStatus() }
    }
  }
  async refreshAuth(): Promise<RefreshCurrentOrcaProfileAuthResult> {
    {
      return { status: 'local', auth: this.getAuthStatus() }
    }
  }
  async selectOrg(_orgId: string): Promise<SelectOrcaProfileOrgResult> {
    {
      return { status: 'unconfigured', auth: this.getAuthStatus() }
    }
  }
  /** Every sign-out, whichever caller (window or runtime RPC) made it. */
  onSignOutStarted(listener: () => void): () => void {
    this.signOutListeners.add(listener)
    return () => {
      this.signOutListeners.delete(listener)
    }
  }
  async signOut(): Promise<SignOutCurrentOrcaProfileResult> {
    {
      const active = ensureActiveOrcaProfile(this.userDataPath())
      return {
        status: 'signed-out',
        auth: this.getAuthStatus(),
        activeProfileId: active.profile.id,
        profiles: active.index.profiles
      }
    }
  }
}
