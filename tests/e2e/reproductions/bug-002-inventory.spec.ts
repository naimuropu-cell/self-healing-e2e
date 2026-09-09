import { test, expect } from '@playwright/test';
import { LoginPage, CatalogPage, CartModal, CheckoutModal, OrderConfirmationPage } from '../../pages';

test.describe('Reproduction Suite: BUG-002 Inventory Depletion & Stock Guard', () => {
  test('should decrement available product stock after placing an order and guard against overselling', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    const catalogPage = new CatalogPage(page);
    const cartModal = new CartModal(page);
    const checkoutModal = new CheckoutModal(page);
    const orderConfirmationPage = new OrderConfirmationPage(page);

    // 1. Authenticate and enter catalog
    await loginPage.goto();
    await loginPage.login('demo_user', 'password123');
    await catalogPage.assertCatalogVisible();

    // 2. Assert initial stock for prod-004 is 5
    const stockIndicator = page.getByTestId('product-stock-prod-004');
    await expect(stockIndicator).toBeVisible();
    await expect(stockIndicator).toHaveText('5 in stock');

    // 3. Add prod-004 to cart and increment to 2 units
    await catalogPage.addProductToCart('prod-004');
    await catalogPage.openCart();
    await cartModal.incrementQty('prod-004');
    await cartModal.assertItemQuantity('prod-004', 2);

    // 4. Proceed to checkout and submit order
    await cartModal.proceedToCheckout();
    await checkoutModal.submitOrder();
    await orderConfirmationPage.assertOrderConfirmed();

    // 5. Return to catalog and verify stock decremented to 3
    await orderConfirmationPage.continueShopping();
    await catalogPage.assertCatalogVisible();

    await expect(stockIndicator).toBeVisible();
    await expect(stockIndicator).toHaveText('3 in stock');
  });
});
