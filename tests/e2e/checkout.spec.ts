import { test } from '@playwright/test';
import {
  LoginPage,
  CatalogPage,
  CartModal,
  CheckoutModal,
  OrderConfirmationPage,
} from '../pages';

test.describe('E2E Store Journey: Authentication & Checkout', () => {
  test('should allow a user to log in, add product to cart, and complete checkout', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const catalogPage = new CatalogPage(page);
    const cartModal = new CartModal(page);
    const checkoutModal = new CheckoutModal(page);
    const orderConfirmationPage = new OrderConfirmationPage(page);

    // 1. Visit application & login
    await loginPage.goto();
    await loginPage.login('demo_user', 'password123');

    // 2. Verify catalog & add product
    await catalogPage.assertCatalogVisible();
    await catalogPage.assertProductVisible('prod-001');
    await catalogPage.addProductToCart('prod-001');
    await catalogPage.assertCartBadgeCount(1);

    // 3. Open cart and proceed to checkout
    await catalogPage.openCart();
    await cartModal.assertModalVisible();
    await cartModal.assertItemPresent('prod-001');
    await cartModal.proceedToCheckout();

    // 4. Fill checkout details and submit order
    await checkoutModal.assertModalVisible();
    await checkoutModal.fillDetails({
      fullName: 'Alice Quality',
      email: 'alice@qa-corp.internal',
      address: '404 Automation Blvd',
      city: 'Austin',
      postalCode: '78701',
    });
    await checkoutModal.submitOrder();

    // 5. Verify order receipt
    await orderConfirmationPage.assertOrderConfirmed();
  });
});
