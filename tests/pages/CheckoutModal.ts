import { Page, Locator, expect } from '@playwright/test';

export interface CheckoutDetails {
  fullName: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  cardNumber?: string;
}

export class CheckoutModal {
  readonly page: Page;
  readonly modal: Locator;
  readonly closeButton: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly addressInput: Locator;
  readonly cityInput: Locator;
  readonly zipInput: Locator;
  readonly cardInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.getByTestId('checkout-modal');
    this.closeButton = page.getByTestId('close-checkout');
    this.nameInput = page.getByTestId('input-name');
    this.emailInput = page.getByTestId('input-email');
    this.addressInput = page.getByTestId('input-address');
    this.cityInput = page.getByTestId('input-city');
    this.zipInput = page.getByTestId('input-zip');
    this.cardInput = page.getByTestId('input-card');
    this.submitButton = page.getByTestId('submit-order');
  }

  async fillDetails(details: CheckoutDetails) {
    await this.nameInput.fill(details.fullName);
    await this.emailInput.fill(details.email);
    await this.addressInput.fill(details.address);
    await this.cityInput.fill(details.city);
    await this.zipInput.fill(details.postalCode);
    if (details.cardNumber) {
      await this.cardInput.fill(details.cardNumber);
    }
  }

  async submitOrder() {
    await this.submitButton.click();
  }

  async close() {
    await this.closeButton.click();
    await expect(this.modal).not.toBeVisible();
  }

  async assertModalVisible() {
    await expect(this.modal).toBeVisible();
  }
}
