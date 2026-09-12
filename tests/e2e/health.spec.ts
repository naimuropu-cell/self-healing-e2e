import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { analyzeLocatorHealth, scoreSelector } from 'playwright-autoheal';

test.describe('Autonomous Locator Health & Fragility Analyzer', () => {
  test('should accurately score individual selector strategies and identify brittle patterns', async () => {
    // 1. Rock-solid data-testid
    const testIdEval = scoreSelector('product-card-prod-001', 'testid');
    expect(testIdEval.score).toBe(100);
    expect(testIdEval.level).toBe('EXCELLENT');
    expect(testIdEval.issues.length).toBe(0);

    // 2. Semantic Accessible Role
    const roleEval = scoreSelector('button', 'role');
    expect(roleEval.score).toBeGreaterThanOrEqual(90);
    expect(roleEval.level).toBe('EXCELLENT');

    // 3. Brittle Deep CSS Hierarchy
    const deepCssEval = scoreSelector('div.container > form > div.actions > button.primary', 'css');
    expect(deepCssEval.score).toBeLessThanOrEqual(50);
    expect(deepCssEval.level).toBe('BRITTLE');
    expect(deepCssEval.issues.some((i) => i.includes('Deep CSS nesting'))).toBe(true);

    // 4. Positional Indexing Selector
    const positionalEval = scoreSelector('ul.item-list > li:nth-child(3)', 'css');
    expect(positionalEval.score).toBeLessThanOrEqual(50);
    expect(positionalEval.issues.some((i) => i.includes('Positional index selector'))).toBe(true);

    // 5. Absolute XPath
    const xpathEval = scoreSelector('/html/body/div[1]/form/input', 'xpath');
    expect(xpathEval.score).toBeLessThanOrEqual(25);
    expect(xpathEval.level).toBe('CRITICAL');
    expect(xpathEval.issues.some((i) => i.includes('Absolute DOM hierarchy in XPath'))).toBe(true);
  });

  test('should audit repository Page Objects and compute high resilience score', async () => {
    const pagesDir = path.resolve(__dirname, '../pages');
    const summary = analyzeLocatorHealth({
      targetDir: pagesDir,
    });

    // 1. Assertions on overall health
    expect(summary.totalScanned).toBeGreaterThan(15);
    expect(summary.overallScore).toBeGreaterThanOrEqual(90);
    expect(['A+', 'A']).toContain(summary.grade);

    // 2. Assertions on breakdown
    expect(summary.breakdown.excellent).toBeGreaterThan(15);
    expect(summary.breakdown.critical).toBe(0);
    expect(summary.breakdown.brittle).toBe(0);

    // 3. Assertions on report text
    expect(summary.summaryText).toContain('LOCATOR HEALTH & FRAGILITY AUDIT');
    expect(summary.summaryText).toContain('Overall Health Score');
    expect(summary.summaryText).toContain('Total Locators Scanned');
  });

  test('should detect brittle locators in custom fixture and generate actionable fix recommendations', async () => {
    const tempFixtureDir = path.resolve(__dirname, '../test-results/health-fixture');
    if (!fs.existsSync(tempFixtureDir)) {
      fs.mkdirSync(tempFixtureDir, { recursive: true });
    }

    const dummySpec = path.join(tempFixtureDir, 'brittle-sample.ts');
    const dummyContent = `
      import { test } from '@playwright/test';
      test('sample test', async ({ page }) => {
        await page.getByTestId('clean-button').click();
        await page.locator('div > div > span > button.btn').click();
        await page.locator('/html/body/div[1]/input').fill('brittle');
      });
    `;

    fs.writeFileSync(dummySpec, dummyContent, 'utf-8');

    try {
      const summary = analyzeLocatorHealth({
        targetDir: tempFixtureDir,
      });

      expect(summary.totalScanned).toBe(3);

      const excellent = summary.findings.find((f) => f.rawLocator.includes('clean-button'));
      expect(excellent).toBeDefined();
      expect(excellent?.level).toBe('EXCELLENT');
      expect(excellent?.score).toBe(100);

      const deepCss = summary.findings.find((f) => f.rawLocator.includes('div > div > span > button'));
      expect(deepCss).toBeDefined();
      expect(deepCss?.score).toBeLessThanOrEqual(50);
      expect(deepCss?.recommendation).toBeDefined();

      const absoluteXpath = summary.findings.find((f) => f.rawLocator.includes('/html/body'));
      expect(absoluteXpath).toBeDefined();
      expect(absoluteXpath?.level).toBe('CRITICAL');
    } finally {
      try {
        if (fs.existsSync(dummySpec)) fs.unlinkSync(dummySpec);
        if (fs.existsSync(tempFixtureDir)) fs.rmdirSync(tempFixtureDir);
      } catch (_) {}
    }
  });
});
