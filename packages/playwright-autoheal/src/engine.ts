import type { Page, Locator } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import {
  SelectorStrategy,
  SelfHealingDescriptor,
  HealingAuditEntry,
  EngineConfig,
  ResolveResult,
} from './types';
import { recoverElementWithAI } from './ai-recovery';

export function getDefaultAuditFilePath(): string {
  if (process.env.HEALING_AUDIT_FILE) {
    return path.resolve(process.env.HEALING_AUDIT_FILE);
  }
  const cwd = process.cwd();
  if (path.basename(cwd) === 'tests' || path.basename(cwd) === 'test') {
    return path.resolve(cwd, 'test-results/healing-audit.json');
  }
  return path.resolve(cwd, 'tests/test-results/healing-audit.json');
}

export const DEFAULT_AUDIT_FILE = getDefaultAuditFilePath();

let globalConfig: EngineConfig = {
  auditFilePath: DEFAULT_AUDIT_FILE,
  primaryTimeoutMs: 1500,
  fallbackTimeoutMs: 2000,
  verbose: true,
};

/**
 * Resolves a Playwright Locator according to a strategy specification.
 */
export function locateByStrategy(page: Page, strategy: SelectorStrategy): Locator {
  switch (strategy.type) {
    case 'testid':
      return page.getByTestId(strategy.value);
    case 'role':
      return page.getByRole(strategy.value as any, strategy.options);
    case 'text':
      return page.getByText(strategy.value, strategy.options);
    case 'label':
      return page.getByLabel(strategy.value, strategy.options);
    case 'placeholder':
      return page.getByPlaceholder(strategy.value, strategy.options);
    case 'css':
      return page.locator(strategy.value);
    default:
      return page.locator(strategy.value);
  }
}

/**
 * Appends a healing event to the audit ledger.
 */
export function recordHealingEvent(entry: HealingAuditEntry, customPath?: string): void {
  const auditFile = customPath || globalConfig.auditFilePath || DEFAULT_AUDIT_FILE;
  try {
    const dir = path.dirname(auditFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let entries: HealingAuditEntry[] = [];
    if (fs.existsSync(auditFile)) {
      const content = fs.readFileSync(auditFile, 'utf-8');
      entries = JSON.parse(content || '[]');
    }

    entries.push(entry);
    fs.writeFileSync(auditFile, JSON.stringify(entries, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[SelfHealingEngine] Failed to write healing audit event:', err);
  }
}

export class SelfHealingEngine {
  /**
   * Configure global engine settings.
   */
  static configure(config: Partial<EngineConfig>): void {
    globalConfig = { ...globalConfig, ...config };
  }

  /**
   * Get the current effective audit file path.
   */
  static getAuditFilePath(): string {
    return globalConfig.auditFilePath || DEFAULT_AUDIT_FILE;
  }

  /**
   * Attempts to locate an element using the primary strategy.
   * If the primary fails, iterates through fallbacks until recovery succeeds.
   */
  static async resolve(
    page: Page,
    descriptor: SelfHealingDescriptor,
    options?: EngineConfig
  ): Promise<ResolveResult<Locator>> {
    const config = { ...globalConfig, ...options };
    const primaryTimeout = config.primaryTimeoutMs ?? 1500;
    const fallbackTimeout = config.fallbackTimeoutMs ?? 2000;
    const startTime = Date.now();

    const primaryLocator = locateByStrategy(page, descriptor.primary);

    // 1. Attempt Primary Locator
    try {
      await primaryLocator.waitFor({ state: 'visible', timeout: primaryTimeout });
      return {
        locator: primaryLocator,
        healed: false,
        strategy: descriptor.primary,
        durationMs: Date.now() - startTime,
      };
    } catch {
      if (config.verbose) {
        console.warn(
          `\n⚠️ [Self-Healing Engine] Primary selector failed for "${descriptor.name}" (${descriptor.primary.type}: "${descriptor.primary.value}"). Triggering fallback heuristics...`
        );
      }
    }

    // 2. Iterate Fallback Strategies
    for (const fallback of descriptor.fallbacks) {
      try {
        const candidate = locateByStrategy(page, fallback);
        await candidate.waitFor({ state: 'visible', timeout: fallbackTimeout });

        const resolutionTime = Date.now() - startTime;
        if (config.verbose) {
          console.info(
            `✅ [Self-Healing Engine] Successfully recovered "${descriptor.name}" using fallback: [${fallback.type}] "${fallback.value}" in ${resolutionTime}ms`
          );
        }

        // Record healing event
        recordHealingEvent(
          {
            timestamp: new Date().toISOString(),
            elementName: descriptor.name,
            primaryFailed: descriptor.primary,
            healedWith: fallback,
            pageUrl: page.url(),
            resolutionTimeMs: resolutionTime,
            status: 'HEALED_SUCCESSFULLY',
          },
          config.auditFilePath
        );

        return {
          locator: candidate,
          healed: true,
          strategy: fallback,
          durationMs: resolutionTime,
        };
      } catch {
        // Fallback failed, continue to next strategy
      }
    }

    // 3. AI-Powered Semantic Locator Recovery
    const aiRecovery = await recoverElementWithAI(page, descriptor, config);
    if (aiRecovery) {
      recordHealingEvent(
        {
          timestamp: new Date().toISOString(),
          elementName: descriptor.name,
          primaryFailed: descriptor.primary,
          healedWith: aiRecovery.strategy,
          pageUrl: page.url(),
          resolutionTimeMs: Date.now() - startTime,
          status: 'HEALED_SUCCESSFULLY',
          recoveryEngine: aiRecovery.recoveryEngine,
        },
        config.auditFilePath
      );

      return {
        locator: aiRecovery.locator,
        healed: true,
        strategy: aiRecovery.strategy,
        durationMs: Date.now() - startTime,
      };
    }

    // 4. Exhausted All Strategies
    throw new Error(
      `[Self-Healing Engine] Critical: All locator strategies (including AI Semantic Recovery) failed for "${descriptor.name}". Evaluated ${
        descriptor.fallbacks.length + 1
      } strategies and AI DOM analysis without locating target DOM element.`
    );
  }

  /**
   * Resilient click that auto-heals broken locators transparently.
   */
  static async click(
    page: Page,
    descriptor: SelfHealingDescriptor,
    options?: EngineConfig
  ): Promise<void> {
    const { locator } = await this.resolve(page, descriptor, options);
    await locator.click();
  }

  /**
   * Resilient fill that auto-heals broken input locators transparently.
   */
  static async fill(
    page: Page,
    descriptor: SelfHealingDescriptor,
    value: string,
    options?: EngineConfig
  ): Promise<void> {
    const { locator } = await this.resolve(page, descriptor, options);
    await locator.fill(value);
  }

  /**
   * Reads healing audit entries from disk.
   */
  static getAuditEntries(customPath?: string): HealingAuditEntry[] {
    const auditFile = customPath || globalConfig.auditFilePath || DEFAULT_AUDIT_FILE;
    try {
      if (fs.existsSync(auditFile)) {
        return JSON.parse(fs.readFileSync(auditFile, 'utf-8'));
      }
    } catch {
      // Return empty array on read failure
    }
    return [];
  }

  /**
   * Clears the current audit ledger.
   */
  static clearAuditEntries(customPath?: string): void {
    const auditFile = customPath || globalConfig.auditFilePath || DEFAULT_AUDIT_FILE;
    try {
      if (fs.existsSync(auditFile)) {
        fs.unlinkSync(auditFile);
      }
    } catch {
      // Ignore if file doesn't exist
    }
  }
}
