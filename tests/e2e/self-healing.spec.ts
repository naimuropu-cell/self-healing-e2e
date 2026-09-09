import { test, expect } from '@playwright/test';
import { LoginPage, CatalogPage } from '../pages';
import { SelfHealingEngine, SelfHealingDescriptor } from '../utils/self-healing';

test.describe('Autonomous Self-Healing Engine Demonstration', () => {
  test('should resolve primary locator quickly when valid without triggering fallback', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const descriptor: SelfHealingDescriptor = {
      name: 'Username Input Field',
      primary: { type: 'testid', value: 'login-username' },
      fallbacks: [
        { type: 'placeholder', value: 'Enter username' },
        { type: 'label', value: 'Username' },
      ],
    };

    const { healed, strategy } = await SelfHealingEngine.resolve(page, descriptor);
    expect(healed).toBe(false);
    expect(strategy.type).toBe('testid');
  });

  test('should transparently self-heal broken test-id locator using fallback heuristic and record audit', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    const catalogPage = new CatalogPage(page);

    await loginPage.goto();
    await loginPage.login('demo_user', 'password123');
    await catalogPage.assertCatalogVisible();

    // Intentionally mutated primary selector that no longer exists in DOM
    const brokenAddToCartDescriptor: SelfHealingDescriptor = {
      name: 'Add to Cart Button (Mutated Selector)',
      primary: { type: 'testid', value: 'deprecated-legacy-add-to-cart-prod-001' },
      fallbacks: [
        // Fallback 1: CSS selector targeting button within product card
        { type: 'css', value: '[data-testid="product-card-prod-001"] .btn-add-cart' },
        // Fallback 2: Accessible Role selector
        { type: 'role', value: 'button', options: { name: /add to cart/i } },
      ],
    };

    // Execute resilient self-healing click
    await SelfHealingEngine.click(page, brokenAddToCartDescriptor);

    // Verify application state correctly transitioned despite broken selector
    await catalogPage.assertCartBadgeCount(1);

    // Verify audit entry was preserved for autonomous engineer review
    const auditEntries = SelfHealingEngine.getAuditEntries();
    expect(auditEntries.length).toBeGreaterThan(0);

    const healedEntry = auditEntries.find((e) => e.elementName === 'Add to Cart Button (Mutated Selector)');
    expect(healedEntry).toBeDefined();
    expect(healedEntry?.primaryFailed.value).toBe('deprecated-legacy-add-to-cart-prod-001');
    expect(healedEntry?.status).toBe('HEALED_SUCCESSFULLY');
  });

  test('should self-heal mutated input locator via placeholder fallback during login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Primary testid mutated from 'login-username' to 'broken-username-v2'
    const mutatedUsernameDescriptor: SelfHealingDescriptor = {
      name: 'Login Username Input',
      primary: { type: 'testid', value: 'broken-username-v2' },
      fallbacks: [
        { type: 'placeholder', value: 'Enter username' },
        { type: 'label', value: 'Username' },
      ],
    };

    await SelfHealingEngine.fill(page, mutatedUsernameDescriptor, 'demo_user');

    // Fill password normally and authenticate
    await page.getByTestId('login-password').fill('password123');
    await page.getByTestId('login-submit').click();

    // Verify login succeeded
    await expect(page.getByTestId('product-grid')).toBeVisible();

    // Confirm healing was logged
    const audit = SelfHealingEngine.getAuditEntries();
    expect(audit.some((e) => e.elementName === 'Login Username Input')).toBe(true);
  });
});
