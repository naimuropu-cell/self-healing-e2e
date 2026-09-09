# Defect Ticket: [BUG-003] Rapid double-click on 'Place Order' triggers duplicate order submissions and race condition

- **Status**: Fixed & Verified
- **Severity**: Critical
- **Reported Date**: 2026-09-10
- **Affected Area**: Checkout Modal & Order Processing
- **Reporter**: Payment Gateway & QA Lead

---

## 1. Description
Customer support and payment audit logs indicate that customers on high-latency connections frequently double-click or spam the "Place Order" button. Because the checkout modal has no `isSubmitting` idempotency guard, multiple order submission handlers execute in parallel. This results in duplicate order generation, double stock deductions, and unexpected state desynchronization.

---

## 2. Steps to Reproduce
1. Navigate to the storefront at `http://localhost:5188/`.
2. Authenticate using demo credentials (`demo_user` / `password123`).
3. Add **NeuralPulse Wireless Headphones** (`prod-001`, stock: 15) to the cart.
4. Open the shopping cart and click **Proceed to Checkout**.
5. In the checkout modal, execute rapid consecutive clicks on the **Place Order** button (`data-testid="complete-purchase-btn"`).
6. Observe the submit button state and subsequent stock deduction.

---

## 3. Expected Behavior
- Upon the first click, the submission button must immediately transition to a disabled state (`disabled`) and display loading feedback (e.g., `Processing Order...`).
- Subsequent clicks must be ignored (idempotent submission).
- Only one order should be confirmed, and product inventory must decrement by exactly 1 unit (15 $\to$ 14).

---

## 4. Actual Behavior
- The button remains active and clickable during submission.
- Multiple click events register, decrementing inventory multiple times or causing race condition errors.

---

## 5. Potential Root Cause / Hints
- `app/src/App.tsx`: `handlePlaceOrder` lacks an `isSubmitting` lock/guard.
- Button does not bind `disabled={isSubmitting}` or show `Processing Order...`.

---

## 6. Autonomous QA Resolution Log
- **Reproduction Spec**: `tests/e2e/reproductions/bug-003-double-click.spec.ts` (Captured failure trace: missing disabled attribute and unhandled concurrent click events)
- **Root Cause Identified**: Order submission lacked idempotency locking and loading state feedback, causing concurrent submissions when clicked rapidly.
- **Code/Test Changes Applied**:
  - `app/src/App.tsx`: Added `isSubmittingOrder` state. Implemented idempotency guard in `handlePlaceOrder`. Disabled submit button during processing with `Processing Order...` status.
  - `tests/e2e/reproductions/bug-003-double-click.spec.ts`: Automated regression spec created and verified.
- **Verification Status**: Verified Green (16 passed across complete test suite).
