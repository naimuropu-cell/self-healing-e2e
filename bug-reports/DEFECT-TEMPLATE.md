# Defect Ticket: [DEFECT-XXX] [Short Summary of Issue]

- **Status**: [ Open | Under Investigation | Reproduction Scripted | Fixed & Verified ]
- **Severity**: [ Critical | High | Medium | Low ]
- **Reported Date**: 2026-09-09
- **Affected Area**: [ Auth | Catalog | Cart | Checkout | Order Confirmation ]

---

## 1. Description
Brief summary of the observed defect or broken test behavior.

## 2. Steps to Reproduce
1. Navigate to `http://localhost:5173/`
2. Authenticate with `demo_user` / `password123`
3. ...
4. Observe failure

## 3. Expected Behavior
Clear statement of what should have occurred.

## 4. Actual Behavior
What actually happened (e.g., button unresponsive, locator timed out, error thrown).

## 5. Potential Root Cause / Hints
- File / Component: `app/src/App.tsx`
- Affected Test: `tests/e2e/checkout.spec.ts`
- Expected Locator / Data-TestId: `data-testid="..."`

---

## 6. Autonomous QA Resolution Log
*(To be populated during automated diagnosis and repair)*
- **Reproduction Spec**: `tests/e2e/reproductions/defect-xxx.spec.ts`
- **Root Cause Identified**: 
- **Code/Test Changes Applied**:
- **Verification Status**: [ Green / Verified ]
