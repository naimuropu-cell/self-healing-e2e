import type { Page, Locator, TestType } from '@playwright/test';
import { SelfHealingEngine } from './engine';
import { SelfHealingDescriptor, EngineConfig, ResolveResult } from './types';

/**
 * Type guard to check if a parameter is a SelfHealingDescriptor.
 */
export function isSelfHealingDescriptor(target: any): target is SelfHealingDescriptor {
  return (
    target &&
    typeof target === 'object' &&
    'name' in target &&
    'primary' in target &&
    Array.isArray(target.fallbacks)
  );
}

export class AutoHealPageWrapper {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Resilient click that auto-heals if target is a SelfHealingDescriptor,
   * or delegates to native Playwright page.click if string selector.
   */
  async click(
    target: string | SelfHealingDescriptor,
    options?: any
  ): Promise<void> {
    if (isSelfHealingDescriptor(target)) {
      return SelfHealingEngine.click(this.page, target, options);
    }
    return this.page.click(target, options);
  }

  /**
   * Resilient fill that auto-heals if target is a SelfHealingDescriptor,
   * or delegates to native Playwright page.fill if string selector.
   */
  async fill(
    target: string | SelfHealingDescriptor,
    value: string,
    options?: any
  ): Promise<void> {
    if (isSelfHealingDescriptor(target)) {
      return SelfHealingEngine.fill(this.page, target, value, options);
    }
    return this.page.fill(target, value, options);
  }

  /**
   * Resolves target descriptor using primary -> fallbacks -> AI recovery.
   */
  async resolve(
    descriptor: SelfHealingDescriptor,
    options?: EngineConfig
  ): Promise<ResolveResult<Locator>> {
    return SelfHealingEngine.resolve(this.page, descriptor, options);
  }

  /**
   * Returns a resolved, resilient Playwright Locator.
   */
  async heal(
    descriptor: SelfHealingDescriptor,
    options?: EngineConfig
  ): Promise<Locator> {
    const result = await this.resolve(descriptor, options);
    return result.locator;
  }
}

/**
 * Creates an augmented Page proxy combining AutoHealPageWrapper and native Playwright Page.
 */
export function createAutoHealPage(page: Page): AutoHealPageWrapper & Page {
  const wrapper = new AutoHealPageWrapper(page);

  return new Proxy(wrapper, {
    get(target: any, prop: string | symbol) {
      if (prop in target) {
        const val = target[prop];
        return typeof val === 'function' ? val.bind(target) : val;
      }
      const pageVal = (page as any)[prop];
      return typeof pageVal === 'function' ? pageVal.bind(page) : pageVal;
    },
  }) as AutoHealPageWrapper & Page;
}

export interface AutoHealFixtures {
  /** Augmented Page fixture with transparent self-healing click(), fill(), and heal() methods */
  autoheal: AutoHealPageWrapper & Page;
  /** Alias for autoheal */
  autohealPage: AutoHealPageWrapper & Page;
}

/**
 * Reusable Playwright fixture definition for `test.extend<AutoHealFixtures>(autoHealFixture)`.
 */
export const autoHealFixture = {
  autoheal: async ({ page }: { page: Page }, use: (r: AutoHealPageWrapper & Page) => Promise<void>) => {
    const augmented = createAutoHealPage(page);
    await use(augmented);
  },
  autohealPage: async ({ page }: { page: Page }, use: (r: AutoHealPageWrapper & Page) => Promise<void>) => {
    const augmented = createAutoHealPage(page);
    await use(augmented);
  },
};

/**
 * Extends any Playwright test instance with the autoheal fixtures.
 *
 * @example
 * ```typescript
 * import { test as base, expect } from '@playwright/test';
 * import { extendWithAutoHeal } from 'playwright-autoheal';
 *
 * export const test = extendWithAutoHeal(base);
 * export { expect };
 * ```
 */
export function extendWithAutoHeal(testInstance: TestType<any, any>): TestType<AutoHealFixtures, any> {
  return testInstance.extend<AutoHealFixtures>(autoHealFixture);
}
