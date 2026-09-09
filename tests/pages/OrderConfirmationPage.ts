import { Page, Locator, expect } from '@playwright/test';

export class OrderConfirmationPage {
  readonly page: Page;
  readonly successScreen: Locator;
  readonly orderId: Locator;
  readonly continueShoppingButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.successScreen = page.getByTestId('order-success-screen');
    this.orderId = page.getByTestId('order-id');
    this.continueShoppingButton = page.getByTestId('continue-shopping');
  }

  async assertOrderConfirmed() {
    await expect(this.successScreen).toBeVisible();
    await expect(this.orderId).toBeVisible();
    await expect(this.orderId).toHaveText(/^ORD-\d+$/);
  }

  async getOrderIdText(): Promise<string> {
    return (await this.orderId.textContent()) || '';
  }

  async continueShopping() {
    await this.continueShoppingButton.click();
    await expect(this.successScreen).not.toBeVisible();
  }
}
