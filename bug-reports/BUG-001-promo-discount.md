# Defect Ticket: [BUG-001] Promo code 'QA20' fails to apply 20% discount to checkout order total

- **Status**: Open
- **Severity**: High
- **Reported Date**: 2026-09-10
- **Affected Area**: Cart & Checkout Flow
- **Reporter**: E-Commerce Marketing & QA Triage

---

## 1. Description
During the Q3 promotional campaign, customers attempting to use promotional discount code `QA20` report that the 20% discount is either not available or not properly deducted from their checkout order total. The checkout screen continues to charge the full pre-discount subtotal amount.

---

## 2. Steps to Reproduce
1. Navigate to the storefront at `http://localhost:5188/`.
2. Authenticate using demo credentials (`demo_user` / `password123`).
3. Add **NeuralPulse Wireless Headphones** (`prod-001`, price: $199.99) to the cart.
4. Open the shopping cart and click **Proceed to Checkout**.
5. In the checkout modal, enter promo code `QA20` and apply it.
6. Observe the displayed total amount before placing the order.
7. Click **Place Order** and observe the confirmed order receipt total.

---

## 3. Expected Behavior
- The checkout modal should provide a promo code input field (`data-testid="input-promo-code"`) and an apply button (`data-testid="apply-promo-button"`).
- Entering `QA20` should display a success badge (`data-testid="promo-success-badge"`) indicating `20% Discount Applied (-$40.00)`.
- The order total amount should be recalculated to **$159.99** (`$199.99 * 0.80`).
- The order confirmation screen and receipt should record the discounted total of **$159.99**.

---

## 4. Actual Behavior
- The checkout form does not have promo code state handling or validation for `QA20`.
- The order is submitted at the original un-discounted price of **$199.99**.

---

## 5. Potential Root Cause / Hints
- **Component**: `app/src/App.tsx` (missing promo state, discount calculation, and voucher input fields in checkout modal).
- **Target Test Selectors**:
  - `data-testid="input-promo-code"`
  - `data-testid="apply-promo-button"`
  - `data-testid="promo-success-badge"`
  - `data-testid="checkout-total-price"`

---

## 6. Autonomous QA Resolution Log
- **Reproduction Spec**: `tests/e2e/reproductions/bug-001-promo.spec.ts` *(To be scripted in Task 4)*
- **Root Cause Identified**: Pending triage
- **Code/Test Changes Applied**: Pending
- **Verification Status**: Open / Ready for Reproduction
