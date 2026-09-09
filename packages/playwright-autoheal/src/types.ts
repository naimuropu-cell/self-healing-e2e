export type SelectorType = 'testid' | 'role' | 'text' | 'label' | 'placeholder' | 'css';

export interface SelectorStrategy {
  type: SelectorType;
  value: string;
  options?: Record<string, any>;
}

export interface SelfHealingDescriptor {
  name: string;
  primary: SelectorStrategy;
  fallbacks: SelectorStrategy[];
}

export interface HealingAuditEntry {
  timestamp: string;
  elementName: string;
  primaryFailed: SelectorStrategy;
  healedWith: SelectorStrategy;
  pageUrl: string;
  resolutionTimeMs: number;
  status: 'HEALED_SUCCESSFULLY';
}

export interface EngineConfig {
  auditFilePath?: string;
  primaryTimeoutMs?: number;
  fallbackTimeoutMs?: number;
  verbose?: boolean;
}

export interface ResolveResult<TLocator = any> {
  locator: TLocator;
  healed: boolean;
  strategy: SelectorStrategy;
  durationMs: number;
}
