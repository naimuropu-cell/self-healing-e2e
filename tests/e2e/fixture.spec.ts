import { test as base, expect } from '@playwright/test';
import { extendWithAutoHeal, SelfHealingDescriptor } from 'playwright-autoheal';

const test = extendWithAutoHeal(base);

test.describe('Playwright Fixture & Transparent Proxy Integration', () => {
  test('should execute full resilient authentication and catalog interaction using autoheal fixture', async ({
    autoheal,
  }) => {
    // 1. Transparent page proxy: goto, assertions, and title
    await autoheal.goto('/');
    await expect(autoheal.getByTestId('app-logo')).toBeVisible();

    // 2. Resilient fill with mutated locator descriptor
    const mutatedUsernameDescriptor: SelfHealingDescriptor = {
      name: 'Login Username Input',
      primary: { type: 'testid', value: 'stale-broken-username-field' },
      fallbacks: [
        { type: 'placeholder', value: 'Enter username' },
        { type: 'label', value: 'Username' },
      ],
    };

    await autoheal.fill(mutatedUsernameDescriptor, 'demo_user');
    await autoheal.getByTestId('login-password').fill('password123');

    // 3. Resilient click with mutated submit button
    const submitBtnDescriptor: SelfHealingDescriptor = {
      name: 'Login Submit Button',
      primary: { type: 'testid', value: 'login-submit' },
      fallbacks: [{ type: 'role', value: 'button', options: { name: /sign in/i } }],
    };

    await autoheal.click(submitBtnDescriptor);

    // 4. Assert catalog loaded
    await expect(autoheal.getByTestId('product-grid')).toBeVisible();

    // 5. Resilient click on product add-to-cart
    const addToCartDescriptor: SelfHealingDescriptor = {
      name: 'Product 1 Add to Cart',
      primary: { type: 'testid', value: 'deprecated-cart-button-prod-001' },
      fallbacks: [
        { type: 'css', value: '[data-testid="product-card-prod-001"] .btn-add-cart' },
        { type: 'role', value: 'button', options: { name: /add to cart/i } },
      ],
    };

    await autoheal.click(addToCartDescriptor);

    // 6. Assert cart badge incremented
    await expect(autoheal.getByTestId('cart-badge')).toHaveText('1');
  });

  test('should resolve and return resilient locator using autoheal.heal()', async ({
    autohealPage,
  }) => {
    await autohealPage.goto('/');

    const logoDescriptor: SelfHealingDescriptor = {
      name: 'App Logo Branding',
      primary: { type: 'testid', value: 'broken-logo-testid' },
      fallbacks: [
        { type: 'testid', value: 'app-logo' },
        { type: 'css', value: '.navbar .logo' },
      ],
    };

    // Use .heal() helper to obtain verified Playwright Locator
    const logoLocator = await autohealPage.heal(logoDescriptor);
    await expect(logoLocator).toBeVisible();
    await expect(logoLocator).toContainText('ApexStore QA');
  });
});
