import { test, expect } from '@playwright/test';
import { LoginPage, CatalogPage } from '../pages';
import { SelfHealingEngine, SelfHealingDescriptor } from 'playwright-autoheal';

test.describe('AI-Powered Semantic Locator Recovery Suite', () => {
  test('should recover element using AI semantic inference when all programmatic fallbacks fail', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    const catalogPage = new CatalogPage(page);

    await loginPage.goto();
    await loginPage.login('demo_user', 'password123');
    await catalogPage.assertCatalogVisible();

    // Both primary testid and all programmatic fallbacks are completely broken / non-existent
    const semanticAddToCartDescriptor: SelfHealingDescriptor = {
      name: 'Add to Cart Button (Hardware Item)',
      primary: { type: 'testid', value: 'broken-ghost-add-to-cart-v9' },
      fallbacks: [
        { type: 'role', value: 'button', options: { name: 'non-existent-button-label' } },
        { type: 'css', value: '.completely-missing-class-selector' },
        { type: 'placeholder', value: 'non-existent-placeholder' },
      ],
      aiHint: 'Click to add product prod-001 to shopping cart',
    };

    // Resilient click: passes through primary failure, exhausts all fallbacks,
    // and successfully triggers Phase 3 AI Semantic Recovery!
    await SelfHealingEngine.click(page, semanticAddToCartDescriptor);

    // Verify application state transitioned successfully
    await catalogPage.assertCartBadgeCount(1);

    // Verify audit entry recorded AI semantic recovery
    const auditEntries = SelfHealingEngine.getAuditEntries();
    const aiEntry = auditEntries.find((e) => e.elementName === 'Add to Cart Button (Hardware Item)');
    expect(aiEntry).toBeDefined();
    expect(aiEntry?.healedWith.type).toBe('ai-semantic');
    expect(aiEntry?.status).toBe('HEALED_SUCCESSFULLY');
    expect(aiEntry?.recoveryEngine).toBeDefined();
  });

  test('should recover text input field via AI semantic contextual inference', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Primary testid and all fallback strategies fail
    const semanticUsernameInputDescriptor: SelfHealingDescriptor = {
      name: 'Username Input Field',
      primary: { type: 'testid', value: 'missing-user-input-box' },
      fallbacks: [
        { type: 'css', value: '#nonexistent-id' },
        { type: 'placeholder', value: 'invalid-placeholder-text' },
      ],
      aiHint: 'Input field for entering customer login username',
    };

    // Resilient fill via AI Semantic Recovery
    await SelfHealingEngine.fill(page, semanticUsernameInputDescriptor, 'demo_user');

    // Confirm input field was filled
    const usernameLocator = page.getByTestId('login-username');
    await expect(usernameLocator).toHaveValue('demo_user');

    // Confirm healing was logged as ai-semantic
    const audit = SelfHealingEngine.getAuditEntries();
    const usernameEntry = audit.find((e) => e.elementName === 'Username Input Field');
    expect(usernameEntry).toBeDefined();
    expect(usernameEntry?.healedWith.type).toBe('ai-semantic');
  });
});
