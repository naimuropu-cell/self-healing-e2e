import { Page, Locator, expect } from '@playwright/test';

export class CatalogPage {
  readonly page: Page;
  readonly productGrid: Locator;
  readonly cartButton: Locator;
  readonly cartBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.productGrid = page.getByTestId('product-grid');
    this.cartButton = page.getByTestId('cart-button');
    this.cartBadge = page.getByTestId('cart-badge');
  }

  getProductCard(productId: string): Locator {
    return this.page.getByTestId(`product-card-${productId}`);
  }

  getAddToCartButton(productId: string): Locator {
    return this.page.getByTestId(`add-to-cart-button-${productId}`);
  }

  async addProductToCart(productId: string) {
    await this.getAddToCartButton(productId).click();
  }

  async openCart() {
    await this.cartButton.click();
  }

  async assertCatalogVisible() {
    await expect(this.productGrid).toBeVisible();
  }

  async assertProductVisible(productId: string) {
    await expect(this.getProductCard(productId)).toBeVisible();
  }

  async assertCartBadgeCount(expectedCount: number) {
    await expect(this.cartBadge).toHaveText(String(expectedCount));
  }
}
