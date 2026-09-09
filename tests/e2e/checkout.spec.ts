import { test, expect } from '@playwright/test';

test.describe('E2E Store Journey: Authentication & Checkout', () => {
  test('should allow a user to log in, add product to cart, and complete checkout', async ({ page }) => {
    // 1. Visit the store application
    await page.goto('/');
    await expect(page.getByTestId('app-logo')).toBeVisible();

    // 2. Perform authentication
    await page.getByTestId('login-username').fill('demo_user');
    await page.getByTestId('login-password').fill('password123');
    await page.getByTestId('login-submit').click();

    // 3. Verify user enters catalog
    await expect(page.getByTestId('product-grid')).toBeVisible();
    await expect(page.getByTestId('product-card-prod-001')).toBeVisible();

    // 4. Add product to cart
    await page.getByTestId('add-to-cart-button-prod-001').click();
    await expect(page.getByTestId('cart-badge')).toHaveText('1');

    // 5. Open cart and proceed to checkout
    await page.getByTestId('cart-button').click();
    await expect(page.getByTestId('cart-modal')).toBeVisible();
    await expect(page.getByTestId('cart-item-prod-001')).toBeVisible();
    await page.getByTestId('proceed-to-checkout').click();

    // 6. Complete and submit checkout form
    await expect(page.getByTestId('checkout-modal')).toBeVisible();
    await page.getByTestId('input-name').fill('Alice Quality');
    await page.getByTestId('input-email').fill('alice@qa-corp.internal');
    await page.getByTestId('input-address').fill('404 Automation Blvd');
    await page.getByTestId('input-city').fill('Austin');
    await page.getByTestId('input-zip').fill('78701');
    await page.getByTestId('submit-order').click();

    // 7. Verify order confirmation and order ID
    await expect(page.getByTestId('order-success-screen')).toBeVisible();
    const orderIdLocator = page.getByTestId('order-id');
    await expect(orderIdLocator).toBeVisible();
    await expect(orderIdLocator).toHaveText(/^ORD-\d+$/);
  });
});
