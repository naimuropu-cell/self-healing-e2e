import { Page, Locator } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export type SelectorType = 'testid' | 'role' | 'text' | 'label' | 'placeholder' | 'css';

export interface SelectorStrategy {
  type: SelectorType;
  value: string;
  options?: any;
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

const AUDIT_FILE_PATH = path.resolve(__dirname, '../test-results/healing-audit.json');

/**
 * Appends a healing event to the audit ledger for autonomous repair workflows.
 */
function recordHealingEvent(entry: HealingAuditEntry) {
  try {
    const dir = path.dirname(AUDIT_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let entries: HealingAuditEntry[] = [];
    if (fs.existsSync(AUDIT_FILE_PATH)) {
      const content = fs.readFileSync(AUDIT_FILE_PATH, 'utf-8');
      entries = JSON.parse(content || '[]');
    }

    entries.push(entry);
    fs.writeFileSync(AUDIT_FILE_PATH, JSON.stringify(entries, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Self-Healing Engine] Failed to record healing event to audit file:', err);
  }
}

/**
 * Resolves a locator from a strategy definition.
 */
function locateByStrategy(page: Page, strategy: SelectorStrategy): Locator {
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

export class SelfHealingEngine {
  /**
   * Attempts to locate an element using primary selector with fallback recovery.
   * If primary fails, sequentially evaluates fallbacks, records healing audit, and returns the functional locator.
   */
  static async resolve(
    page: Page,
    descriptor: SelfHealingDescriptor,
    primaryTimeoutMs = 1500
  ): Promise<{ locator: Locator; healed: boolean; strategy: SelectorStrategy }> {
    const startTime = Date.now();
    const primaryLocator = locateByStrategy(page, descriptor.primary);

    // 1. Attempt Primary Locator
    try {
      await primaryLocator.waitFor({ state: 'visible', timeout: primaryTimeoutMs });
      return { locator: primaryLocator, healed: false, strategy: descriptor.primary };
    } catch {
      console.warn(
        `\n⚠️ [Self-Healing Engine] Primary selector failed for "${descriptor.name}" (${descriptor.primary.type}: "${descriptor.primary.value}"). Triggering fallback heuristics...`
      );
    }

    // 2. Iterate Fallback Strategies
    for (const fallback of descriptor.fallbacks) {
      try {
        const candidate = locateByStrategy(page, fallback);
        await candidate.waitFor({ state: 'visible', timeout: 2000 });

        const resolutionTime = Date.now() - startTime;
        console.info(
          `✅ [Self-Healing Engine] Successfully recovered "${descriptor.name}" using fallback: [${fallback.type}] "${fallback.value}" in ${resolutionTime}ms`
        );

        // Record healing event for continuous autonomous code healing
        recordHealingEvent({
          timestamp: new Date().toISOString(),
          elementName: descriptor.name,
          primaryFailed: descriptor.primary,
          healedWith: fallback,
          pageUrl: page.url(),
          resolutionTimeMs: resolutionTime,
          status: 'HEALED_SUCCESSFULLY',
        });

        return { locator: candidate, healed: true, strategy: fallback };
      } catch {
        // Continue to next fallback strategy
      }
    }

    // 3. Exhausted All Strategies
    throw new Error(
      `[Self-Healing Engine] Critical: All locator strategies failed for "${descriptor.name}". Evaluated ${
        descriptor.fallbacks.length + 1
      } strategies without locating target DOM element.`
    );
  }

  /**
   * Resilient click that auto-heals broken target locators.
   */
  static async click(page: Page, descriptor: SelfHealingDescriptor): Promise<void> {
    const { locator } = await this.resolve(page, descriptor);
    await locator.click();
  }

  /**
   * Resilient fill that auto-heals broken input locators.
   */
  static async fill(page: Page, descriptor: SelfHealingDescriptor, value: string): Promise<void> {
    const { locator } = await this.resolve(page, descriptor);
    await locator.fill(value);
  }

  /**
   * Read healing audit entries from disk.
   */
  static getAuditEntries(): HealingAuditEntry[] {
    try {
      if (fs.existsSync(AUDIT_FILE_PATH)) {
        return JSON.parse(fs.readFileSync(AUDIT_FILE_PATH, 'utf-8'));
      }
    } catch {
      // Return empty array on read failure
    }
    return [];
  }

  /**
   * Clears the current session audit ledger.
   */
  static clearAuditEntries() {
    try {
      if (fs.existsSync(AUDIT_FILE_PATH)) {
        fs.unlinkSync(AUDIT_FILE_PATH);
      }
    } catch {
      // Ignore if absent
    }
  }
}
