export type SelectorType = 'testid' | 'role' | 'text' | 'label' | 'placeholder' | 'css' | 'ai-semantic';

export interface SelectorStrategy {
  type: SelectorType;
  value: string;
  options?: Record<string, any>;
  confidence?: number;
}

export interface SelfHealingDescriptor {
  name: string;
  primary: SelectorStrategy;
  fallbacks: SelectorStrategy[];
  /** Optional contextual intent hints to assist AI semantic recovery */
  aiHint?: string;
}

export interface HealingAuditEntry {
  timestamp: string;
  elementName: string;
  primaryFailed: SelectorStrategy;
  healedWith: SelectorStrategy;
  pageUrl: string;
  resolutionTimeMs: number;
  status: 'HEALED_SUCCESSFULLY';
  recoveryEngine?: 'heuristic' | 'ai-remote' | 'ai-local';
}

export interface AIConfig {
  /** AI provider to use. Defaults to 'auto' (checks API keys, then falls back to local semantic engine) */
  provider?: 'auto' | 'gemini' | 'openai' | 'custom' | 'local';
  /** API key for Gemini or OpenAI */
  apiKey?: string;
  /** Custom endpoint URL for OpenAI-compatible or local inference server */
  endpoint?: string;
  /** Model identifier (e.g., 'gemini-1.5-flash', 'gpt-4o-mini') */
  model?: string;
  /** Enable or disable AI-powered semantic recovery fallback (default: true) */
  enabled?: boolean;
}

export interface EngineConfig {
  auditFilePath?: string;
  primaryTimeoutMs?: number;
  fallbackTimeoutMs?: number;
  verbose?: boolean;
  ai?: AIConfig;
}

export interface ResolveResult<TLocator = any> {
  locator: TLocator;
  healed: boolean;
  strategy: SelectorStrategy;
  durationMs: number;
}
