import { test, expect } from '@playwright/test';
import { LoginPage, CatalogPage, CartModal } from '../../pages';

test.describe('Reproduction Suite: BUG-001 Promo Code Discount', () => {
  test('should apply 20% discount with promo code QA20 and update order total', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const catalogPage = new CatalogPage(page);
    const cartModal = new CartModal(page);

    // 1. Login and add $199.99 item to cart
    await loginPage.goto();
    await loginPage.login('demo_user', 'password123');
    await catalogPage.assertCatalogVisible();
    await catalogPage.addProductToCart('prod-001');

    // 2. Open cart and proceed to checkout
    await catalogPage.openCart();
    await cartModal.proceedToCheckout();

    // 3. Verify checkout modal is open
    await expect(page.getByTestId('checkout-modal')).toBeVisible();

    // 4. Enter promo code QA20 and click Apply
    const promoInput = page.getByTestId('input-promo-code');
    const applyButton = page.getByTestId('apply-promo-button');

    await expect(promoInput).toBeVisible();
    await promoInput.fill('QA20');
    await applyButton.click();

    // 5. Assert promo success badge and recalculated total ($199.99 * 0.80 = $159.99)
    const promoBadge = page.getByTestId('promo-success-badge');
    await expect(promoBadge).toBeVisible();
    await expect(promoBadge).toContainText('20% Discount Applied');

    const checkoutTotal = page.getByTestId('checkout-total-price');
    await expect(checkoutTotal).toBeVisible();
    await expect(checkoutTotal).toHaveText('$159.99');

    // 6. Submit the order and verify receipt reflects discounted total
    await page.getByTestId('submit-order').click();
    await expect(page.getByTestId('order-success-screen')).toBeVisible();

    const receiptTotal = page.getByTestId('order-receipt-total');
    await expect(receiptTotal).toBeVisible();
    await expect(receiptTotal).toHaveText('$159.99');
  });
});
