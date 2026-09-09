import { Page, Locator, expect } from '@playwright/test';

export class CartModal {
  readonly page: Page;
  readonly modal: Locator;
  readonly closeButton: Locator;
  readonly proceedToCheckoutButton: Locator;
  readonly totalPrice: Locator;
  readonly emptyCartMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.getByTestId('cart-modal');
    this.closeButton = page.getByTestId('close-cart');
    this.proceedToCheckoutButton = page.getByTestId('proceed-to-checkout');
    this.totalPrice = page.getByTestId('cart-total-price');
    this.emptyCartMessage = page.getByText('Your cart is empty.');
  }

  getCartItem(productId: string): Locator {
    return this.page.getByTestId(`cart-item-${productId}`);
  }

  getQtyValue(productId: string): Locator {
    return this.page.getByTestId(`qty-val-${productId}`);
  }

  async incrementQty(productId: string) {
    await this.page.getByTestId(`qty-plus-${productId}`).click();
  }

  async decrementQty(productId: string) {
    await this.page.getByTestId(`qty-minus-${productId}`).click();
  }

  async close() {
    await this.closeButton.click();
    await expect(this.modal).not.toBeVisible();
  }

  async proceedToCheckout() {
    await this.proceedToCheckoutButton.click();
  }

  async assertModalVisible() {
    await expect(this.modal).toBeVisible();
  }

  async assertItemQuantity(productId: string, expectedQty: number) {
    await expect(this.getQtyValue(productId)).toHaveText(String(expectedQty));
  }

  async assertItemPresent(productId: string) {
    await expect(this.getCartItem(productId)).toBeVisible();
  }

  async assertItemNotPresent(productId: string) {
    await expect(this.getCartItem(productId)).not.toBeVisible();
  }

  async assertEmptyCartVisible() {
    await expect(this.emptyCartMessage).toBeVisible();
  }
}
