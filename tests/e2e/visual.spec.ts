import { test, expect } from '@playwright/test';
import { LoginPage, CatalogPage, CartModal } from '../pages';

test.describe('Visual Regression Testing: Storefront UI Baseline', () => {
  test('should match visual snapshot of login screen', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(page).toHaveScreenshot('auth-screen.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.05,
    });
  });

  test('should match visual snapshot of product catalog', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const catalogPage = new CatalogPage(page);

    await loginPage.goto();
    await loginPage.login('demo_user', 'password123');
    await catalogPage.assertCatalogVisible();

    await expect(page).toHaveScreenshot('catalog-screen.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.05,
    });
  });

  test('should match visual snapshot of shopping cart drawer', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const catalogPage = new CatalogPage(page);
    const cartModal = new CartModal(page);

    await loginPage.goto();
    await loginPage.login('demo_user', 'password123');
    await catalogPage.assertCatalogVisible();
    await catalogPage.addProductToCart('prod-001');
    await catalogPage.openCart();
    await cartModal.assertModalVisible();

    await expect(page.getByTestId('cart-modal')).toHaveScreenshot('cart-drawer.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.05,
    });
  });

  test('should match visual snapshot of checkout modal', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const catalogPage = new CatalogPage(page);
    const cartModal = new CartModal(page);

    await loginPage.goto();
    await loginPage.login('demo_user', 'password123');
    await catalogPage.assertCatalogVisible();
    await catalogPage.addProductToCart('prod-001');
    await catalogPage.openCart();
    await cartModal.proceedToCheckout();
    await expect(page.getByTestId('checkout-modal')).toBeVisible();

    await expect(page.getByTestId('checkout-modal')).toHaveScreenshot('checkout-modal.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.05,
    });
  });
});
