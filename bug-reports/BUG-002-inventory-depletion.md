# Defect Ticket: [BUG-002] Stock inventory does not decrement on order placement and allows overselling

- **Status**: Fixed & Verified
- **Severity**: Critical
- **Reported Date**: 2026-09-10
- **Affected Area**: Catalog, Cart, & Order Placement
- **Reporter**: Operations & Inventory Management

---

## 1. Description
Warehouse management reports that product inventory stock counts in the catalog remain unchanged after successful customer checkouts. Furthermore, products with 0 stock continue to allow customers to click "Add to Cart", resulting in overselling of unfulfillable orders.

---

## 2. Steps to Reproduce
1. Navigate to the storefront at `http://localhost:5188/`.
2. Authenticate using demo credentials (`demo_user` / `password123`).
3. Note the displayed available stock for **TitanView 4K Ultra-Wide Monitor** (`prod-004`, initial stock: 5 units).
4. Add 2 units of `prod-004` to cart and complete checkout.
5. Return to the catalog by clicking **Continue Shopping**.
6. Observe the stock count for `prod-004`.
7. Actual: Stock indicator remains un-decremented at 5 units (or missing).
8. Expected: Available stock should decrement from 5 to 3 (`3 in stock`).
9. When a product's stock reaches 0, the button should be disabled with text "Out of Stock".

---

## 3. Expected Behavior
- Each product card in the catalog must display its live available stock count (`data-testid="product-stock-${productId}"`).
- Upon successful order confirmation, the purchased quantity must be decremented from the catalog product's stock.
- When stock reaches 0, the product's button must be disabled, display "Out of Stock" (`data-testid="out-of-stock-${productId}"`), and prevent further additions to the cart.

---

## 4. Actual Behavior
- `products` state is static and never updated on checkout.
- No live stock counter is exposed or decremented.
- Products can be purchased indefinitely regardless of warehouse availability.

---

## 5. Potential Root Cause / Hints
- `app/src/App.tsx`: `products` state lacks setter (`const [products] = useState(...)`).
- `handlePlaceOrder`: Does not decrement stock from `products` state.
- `addToCart`: Does not check if quantity exceeds available `product.stock`.

---

## 6. Autonomous QA Resolution Log
- **Reproduction Spec**: `tests/e2e/reproductions/bug-002-inventory.spec.ts` (Captured failure trace: missing live stock badge and un-decremented inventory)
- **Root Cause Identified**: Target application used immutable `products` state without stock reconciliation on order completion, missing inventory counters, and lacking out-of-stock button guards.
- **Code/Test Changes Applied**:
  - `app/src/App.tsx`: Added `setProducts` updater. Added reactive stock decrement in `handlePlaceOrder`. Added stock boundaries in `addToCart` and `updateQuantity`.
  - UI: Added live stock counter (`data-testid="product-stock-${id}"`) and disabled "Out of Stock" button state.
  - `tests/e2e/reproductions/bug-002-inventory.spec.ts`: Automated regression spec created and verified.
- **Verification Status**: Verified Green (11 passed across complete test suite).
