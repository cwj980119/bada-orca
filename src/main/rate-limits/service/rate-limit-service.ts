import type { LocalAccountRuntimeTarget } from '../../../shared/agent-accounts/local-account-runtime'

import type { BrowserWindow } from 'electron'

import type { AntigravityAccountUsageRecorder } from '../providers/antigravity/antigravity-account-usage'
import type { CodexAccountSelectionTarget } from '../../../shared/agent-accounts/codex/codex-selection-lane'
import type {
  CodexHomePathResolver,
  KimiHomeResolver,
  ClaudeAuthPreparationResolver,
  OpenCodeGoRateLimitConfig,
  MiniMaxRateLimitConfig,
  AntigravityUsageEnabledResolver,
  ClaudeOAuthUsageEnabledResolver,
  MuseUsageEnabledResolver,
  ZcodePlanRateLimitConfig,
  GeminiCliOAuthEnabledResolver,
  InactiveCodexAccountInfo
} from './service-types'
import type { ClaudeAccountSelectionTarget } from '../../claude-accounts/selection/runtime-selection'
import type { InactiveClaudeAccount } from '../providers/claude/claude-managed-account-usage'
import type { RateLimitState } from '../../../shared/agent-usage/rate-limits/rate-limit-types'
import type { NetworkProxySettings } from '../../../shared/network/network-proxy'

import type {
  ProviderRateLimits,
  RateLimitRuntimeTarget,
  CodexRateLimitResetResult
} from '../../../shared/agent-usage/rate-limits/rate-limit-types'

import type { ClaudeStatusLineRateLimits } from '../../../shared/agent-usage/rate-limits/claude-statusline-rate-limits'

export class RateLimitService {
  fetchInactiveClaudeAccountsOnOpen(): void {}
  fetchInactiveCodexAccountsOnOpen(): void {}
  evictInactiveClaudeCache(_id: string): void {}
  evictInactiveCodexCache(_id: string): void {}

  setCodexHomePathResolver(_resolver: CodexHomePathResolver): void {}
  setCodexFetchTarget(_target?: CodexAccountSelectionTarget): void {}
  setKimiHomeResolver(_resolver: KimiHomeResolver): void {}
  setClaudeAuthPreparationResolver(_resolver: ClaudeAuthPreparationResolver): void {}
  setClaudeFetchTarget(_target?: ClaudeAccountSelectionTarget): void {}
  setOpenCodeGoConfigResolver(
    _resolver: () => OpenCodeGoRateLimitConfig,
    _apiKeyResolver?: () => string | null
  ): void {}
  setMiniMaxConfigResolver(_resolver: () => MiniMaxRateLimitConfig): void {}
  setZcodePlanConfigResolver(_resolver: () => ZcodePlanRateLimitConfig): void {}
  setGeminiCliOAuthEnabledResolver(_resolver: GeminiCliOAuthEnabledResolver): void {}
  setClaudeOAuthUsageEnabledResolver(_resolver: ClaudeOAuthUsageEnabledResolver): void {}
  discardClaudeOAuthUsage(): void {}
  setAntigravityUsageEnabledResolver(_resolver: AntigravityUsageEnabledResolver): void {}
  setAntigravityFetchTarget(_target: LocalAccountRuntimeTarget): void {}
  setAntigravityAccountUsageRecorder(_recorder: AntigravityAccountUsageRecorder): void {}
  setMuseUsageEnabledResolver(_resolver: MuseUsageEnabledResolver): void {}
  setNetworkProxySettingsResolver(_resolver: () => NetworkProxySettings): void {}
  setInactiveClaudeAccountsResolver(_resolver: () => InactiveClaudeAccount[]): void {}
  setInactiveCodexAccountsResolver(_resolver: () => InactiveCodexAccountInfo[]): void {}
  attach(_mainWindow: BrowserWindow): void {}
  addUsageViewer(): () => void {
    return () => {}
  }
  start(_options: { fetchImmediately?: boolean } = {}): void {}
  stop(): void {}
  getState(): RateLimitState {
    return {
      claudeTarget: { runtime: 'host', wslDistro: null },
      codexTarget: { runtime: 'host', wslDistro: null },
      claude: null,
      codex: null,
      gemini: null,
      opencodeGo: null,
      kimi: null,
      antigravity: null,
      minimax: null,
      grok: null,
      cursor: null,
      zcode: null,
      muse: null,
      minimaxCookieConfigured: false,
      minimaxApiKeyConfigured: false,
      zcodePlanApiKeyConfigured: false,
      opencodeGoApiKeyConfigured: false,
      grokAuthConfigured: false,
      cursorAuthConfigured: false,
      inactiveClaudeAccounts: [],
      inactiveCodexAccounts: [],
      antigravityAccounts: []
    }
  }
  async refresh(): Promise<RateLimitState> {
    return this.getState()
  }
  async refreshIfStale(): Promise<RateLimitState> {
    return this.getState()
  }
  usageReadingAccount(_provider: 'claude' | 'codex'): { home: string; provenance: string } | null {
    return null
  }
  usageReading(_provider: 'claude' | 'codex'): ProviderRateLimits | null {
    return null
  }
  requestUsageReading(
    _provider: 'claude' | 'codex',
    _options: { notWithinMs?: number } = {}
  ): boolean {
    return false
  }
  async refreshGrok(): Promise<RateLimitState> {
    return this.getState()
  }
  invalidateOpenCodeGoCredentialState(_options: { apiKeyCleared?: boolean } = {}): void {}
  invalidateAntigravityCredentialState(): void {}
  invalidateMiniMaxCredentialState(): void {}
  invalidateZcodeCredentialState(): void {}
  async refreshForCodexAccountChange(
    _outgoingAccountId?: string | null,
    _target?: CodexAccountSelectionTarget
  ): Promise<RateLimitState> {
    return this.getState()
  }
  async refreshCodexForTarget(_target?: CodexAccountSelectionTarget): Promise<RateLimitState> {
    return this.getState()
  }
  async consumeCodexRateLimitResetCredit(_options: {
    idempotencyKey: string
    target: RateLimitRuntimeTarget
    codexHomePath: string | null
  }): Promise<CodexRateLimitResetResult> {
    throw new Error('Online account usage is not part of the internal edition.')
  }
  async refreshForClaudeAccountChange(
    _outgoingAccountId?: string | null,
    _target?: ClaudeAccountSelectionTarget
  ): Promise<RateLimitState> {
    return this.getState()
  }
  async refreshClaudeForTarget(_target?: ClaudeAccountSelectionTarget): Promise<RateLimitState> {
    return this.getState()
  }
  onStateChange(_listener: (state: RateLimitState) => void): () => void {
    return () => {}
  }
  setPollingInterval(_ms: number): void {}
  ingestLiveClaudeRateLimits(_event: ClaudeStatusLineRateLimits): void {}
}
