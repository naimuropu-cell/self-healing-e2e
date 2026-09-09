import { test, expect } from '@playwright/test';
import { LoginPage, CatalogPage, CartModal, OrderConfirmationPage } from '../../pages';

test.describe('Reproduction Suite: BUG-003 Double-Click Race Condition & Submission Guard', () => {
  test('should disable place order button during submission and prevent duplicate orders', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    const catalogPage = new CatalogPage(page);
    const cartModal = new CartModal(page);
    const orderConfirmationPage = new OrderConfirmationPage(page);

    // 1. Login and enter catalog
    await loginPage.goto();
    await loginPage.login('demo_user', 'password123');
    await catalogPage.assertCatalogVisible();

    // 2. Note initial stock for prod-001 (15 in stock)
    const stockIndicator = page.getByTestId('product-stock-prod-001');
    await expect(stockIndicator).toHaveText('15 in stock');

    // 3. Add 1 item to cart and proceed to checkout
    await catalogPage.addProductToCart('prod-001');
    await catalogPage.openCart();
    await cartModal.proceedToCheckout();

    // 4. Verify checkout modal is open
    await expect(page.getByTestId('checkout-modal')).toBeVisible();
    const submitBtn = page.getByTestId('complete-purchase-btn');
    await expect(submitBtn).toBeVisible();

    // 5. Trigger submission and immediately assert button disables with loading state
    await submitBtn.click({ noWaitAfter: true });

    // Expect button to enter disabled loading state immediately upon click
    await expect(submitBtn).toBeDisabled({ timeout: 2000 });
    await expect(submitBtn).toContainText('Processing Order...');

    // 6. Confirm order placement completes exactly once
    await orderConfirmationPage.assertOrderConfirmed();

    // 7. Return to catalog and verify stock decremented by exactly 1 (to 14 in stock)
    await orderConfirmationPage.continueShopping();
    await catalogPage.assertCatalogVisible();
    await expect(stockIndicator).toHaveText('14 in stock');
  });
});
