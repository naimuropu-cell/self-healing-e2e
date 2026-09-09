import { test } from '@playwright/test';
import { LoginPage, CatalogPage } from '../pages';

test.describe('Authentication Flows', () => {
  let loginPage: LoginPage;
  let catalogPage: CatalogPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    catalogPage = new CatalogPage(page);
    await loginPage.goto();
  });

  test('should log in successfully with valid credentials', async () => {
    await loginPage.login('demo_user', 'password123');
    await catalogPage.assertCatalogVisible();
  });

  test('should display an error alert when providing invalid credentials', async () => {
    await loginPage.login('demo_user', 'wrongpassword');
    await loginPage.assertLoginError('Invalid credentials');
  });

  test('should allow an authenticated user to log out', async () => {
    await loginPage.login('demo_user', 'password123');
    await catalogPage.assertCatalogVisible();
    await loginPage.logout();
    await loginPage.assertIsOnLoginPage();
  });
});
