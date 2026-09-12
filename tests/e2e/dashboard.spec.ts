import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { writeHtmlDashboard, HealingAuditEntry } from 'playwright-autoheal';

test.describe('Autonomous Self-Healing Visual Dashboard', () => {
  const customOutputPath = path.resolve(__dirname, '../test-results/dashboard-test-report.html');
  const testAuditPath = path.resolve(__dirname, '../test-results/dashboard-test-audit.json');
  const artifactScreenshot = 'C:/Users/Lenovo/.gemini/antigravity-ide/brain/1c18c787-5eb3-4780-a7d6-65995db54d53/autoheal_dashboard.png';

  const mockEntries: HealingAuditEntry[] = [
    {
      timestamp: '2026-09-12T19:30:00.000Z',
      elementName: 'Add to Cart Button (Hardware Item)',
      primaryFailed: { type: 'testid', value: 'broken-ghost-add-to-cart-v9' },
      healedWith: {
        type: 'ai-semantic',
        value: '[data-testid="add-to-cart-button-prod-001"]',
        confidence: 0.98,
      },
      pageUrl: 'http://localhost:5188/',
      resolutionTimeMs: 4210,
      status: 'HEALED_SUCCESSFULLY',
      recoveryEngine: 'ai-local',
    },
    {
      timestamp: '2026-09-12T19:30:05.000Z',
      elementName: 'Login Username Input',
      primaryFailed: { type: 'testid', value: 'stale-broken-username-field' },
      healedWith: { type: 'placeholder', value: 'Enter username' },
      pageUrl: 'http://localhost:5188/',
      resolutionTimeMs: 1536,
      status: 'HEALED_SUCCESSFULLY',
      recoveryEngine: 'heuristic',
    },
    {
      timestamp: '2026-09-12T19:30:10.000Z',
      elementName: 'Product 1 Add to Cart',
      primaryFailed: { type: 'testid', value: 'deprecated-cart-button-prod-001' },
      healedWith: {
        type: 'css',
        value: '[data-testid="product-card-prod-001"] .btn-add-cart',
      },
      pageUrl: 'http://localhost:5188/',
      resolutionTimeMs: 1531,
      status: 'HEALED_SUCCESSFULLY',
      recoveryEngine: 'heuristic',
    },
    {
      timestamp: '2026-09-12T19:30:15.000Z',
      elementName: 'App Logo Branding',
      primaryFailed: { type: 'testid', value: 'broken-logo-testid' },
      healedWith: { type: 'testid', value: 'app-logo' },
      pageUrl: 'http://localhost:5188/',
      resolutionTimeMs: 1536,
      status: 'HEALED_SUCCESSFULLY',
      recoveryEngine: 'heuristic',
    },
  ];

  test.beforeAll(() => {
    const dir = path.dirname(testAuditPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(testAuditPath, JSON.stringify(mockEntries, null, 2), 'utf-8');

    writeHtmlDashboard({
      auditFilePath: testAuditPath,
      outputPath: customOutputPath,
      title: 'Playwright AutoHeal • Telemetry & Diagnostics Dashboard',
      autoOpen: false,
    });
  });

  test.afterAll(() => {
    try {
      if (fs.existsSync(customOutputPath)) fs.unlinkSync(customOutputPath);
      if (fs.existsSync(testAuditPath)) fs.unlinkSync(testAuditPath);
    } catch (_) {}
  });

  test('should render executive KPI metrics, distribution graphs, and interactive filters', async ({
    page,
  }) => {
    // 1. Navigate to standalone generated HTML file
    const fileUrl = 'file:///' + customOutputPath.replace(/\\/g, '/');
    await page.setViewportSize({ width: 1280, height: 960 });
    await page.goto(fileUrl);

    // 2. Validate branding & title
    await expect(page.locator('.logo-text h1')).toContainText('Playwright AutoHeal');
    await expect(page.locator('.logo-badge')).toHaveText('Telemetry Live');

    // 3. Validate KPI metric cards
    await expect(page.locator('#statTotalInterventions')).toHaveText('4');
    await expect(page.locator('#statAiCount')).toHaveText('1');
    await expect(page.locator('#statHeuristicCount')).toHaveText('3');
    await expect(page.locator('#statAvgLatency')).toContainText('2203');

    // 4. Validate Event Cards & Side-by-side Diff Viewers
    const eventCards = page.locator('.event-card');
    await expect(eventCards).toHaveCount(4);

    const firstCard = eventCards.first();
    await expect(firstCard.locator('.diff-failed')).toBeVisible();
    await expect(firstCard.locator('.diff-healed')).toBeVisible();
    await expect(firstCard.locator('.btn-copy-locator')).toBeVisible();
    await expect(firstCard.locator('.btn-copy-patch')).toBeVisible();

    // 5. Test real-time search filtering
    const searchInput = page.locator('#searchInput');
    await searchInput.fill('Username');

    const visibleAfterSearch = page.locator('.event-card:visible');
    await expect(visibleAfterSearch).toHaveCount(1);
    await expect(visibleAfterSearch.first()).toContainText('Login Username Input');

    // Reset search
    await searchInput.fill('');
    await expect(page.locator('.event-card:visible')).toHaveCount(4);

    // 6. Test filter chips (AI vs Heuristic)
    const aiChip = page.locator('.chip[data-filter="ai"]');
    await aiChip.click();
    const aiVisible = page.locator('.event-card:visible');
    await expect(aiVisible).toHaveCount(1);
    expect(await aiVisible.first().getAttribute('data-engine')).toBe('ai');

    // Return to all
    await page.locator('.chip[data-filter="all"]').click();
    await expect(page.locator('.event-card:visible')).toHaveCount(4);

    // 7. Validate Export Buttons
    await expect(page.locator('#btnExportJson')).toBeVisible();
    await expect(page.locator('#btnCopyPatches')).toBeVisible();

    // 8. Capture high-res visual artifact screenshot
    await page.screenshot({ path: artifactScreenshot, fullPage: true });
    console.log('Saved dashboard screenshot to:', artifactScreenshot);
  });
});
