import { test } from '@playwright/test';
import { LoginPage, CatalogPage, CartModal } from '../pages';

test.describe('Cart Operations & Item Management', () => {
  let loginPage: LoginPage;
  let catalogPage: CatalogPage;
  let cartModal: CartModal;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    catalogPage = new CatalogPage(page);
    cartModal = new CartModal(page);

    await loginPage.goto();
    await loginPage.login('demo_user', 'password123');
    await catalogPage.assertCatalogVisible();
  });

  test('should display empty cart state initially', async () => {
    await catalogPage.openCart();
    await cartModal.assertModalVisible();
    await cartModal.assertEmptyCartVisible();
    await cartModal.close();
  });

  test('should add multiple items and update quantities', async () => {
    // Add two different products
    await catalogPage.addProductToCart('prod-001');
    await catalogPage.addProductToCart('prod-002');
    await catalogPage.assertCartBadgeCount(2);

    // Open cart and verify items exist
    await catalogPage.openCart();
    await cartModal.assertModalVisible();
    await cartModal.assertItemPresent('prod-001');
    await cartModal.assertItemPresent('prod-002');
    await cartModal.assertItemQuantity('prod-001', 1);

    // Increment item 1 quantity
    await cartModal.incrementQty('prod-001');
    await cartModal.assertItemQuantity('prod-001', 2);

    // Decrement item 2 quantity to remove it
    await cartModal.decrementQty('prod-002');
    await cartModal.assertItemNotPresent('prod-002');

    // Verify item 1 remains with updated count
    await cartModal.assertItemPresent('prod-001');
    await cartModal.assertItemQuantity('prod-001', 2);
  });
});
