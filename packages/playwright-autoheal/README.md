# 🛡️ playwright-autoheal

> Autonomous, resilient, closed-loop self-healing locator engine for [Playwright](https://playwright.dev).

`playwright-autoheal` prevents test flakiness caused by changing CSS classes, mutated IDs, renamed test attributes, or DOM restructurings. When a primary selector fails, it sequentially executes multi-strategy heuristic fallbacks (`testid` $\to$ `role` $\to$ `placeholder` $\to$ `label` $\to$ `css`), logs an audit event, and can automatically rewrite your Page Object source code with the healed locators.

---

## 📦 Installation

```bash
npm install --save-dev playwright-autoheal
# or
pnpm add -D playwright-autoheal
# or
yarn add -D playwright-autoheal
```

*Peer Dependency*: `@playwright/test >= 1.30.0`.

---

## ⚡ Quick Start

### 1. Define a Self-Healing Locator Descriptor

In your test or Page Object Model:

```typescript
import { test, expect } from '@playwright/test';
import { SelfHealingEngine, SelfHealingDescriptor } from 'playwright-autoheal';

test('resilient checkout click', async ({ page }) => {
  await page.goto('https://my-app.com');

  const checkoutBtn: SelfHealingDescriptor = {
    name: 'Checkout Button',
    primary: { type: 'testid', value: 'submit-order' },
    fallbacks: [
      { type: 'role', value: 'button', options: { name: /checkout/i } },
      { type: 'css', value: '.btn-checkout-primary' },
      { type: 'text', value: 'Proceed to Checkout' },
    ],
  };

  // Resilient click: if `submit-order` was renamed, it transparently recovers via fallback!
  await SelfHealingEngine.click(page, checkoutBtn);
});
```

### 2. Available Helper Methods

```typescript
// Resilient element resolution
const { locator, healed, strategy, durationMs } = await SelfHealingEngine.resolve(page, descriptor);

// Resilient element click
await SelfHealingEngine.click(page, descriptor);

// Resilient text fill
await SelfHealingEngine.fill(page, descriptor, 'hello@example.com');
```

---

## 🛠️ CLI & Code Patching

`playwright-autoheal` tracks all healed runtime events in `tests/test-results/healing-audit.json`.

### View Audit Report
```bash
npx playwright-autoheal report
```

### Permanently Patch Page Objects
Eliminate fallback latency on subsequent runs by rewriting outdated source code:
```bash
npx playwright-autoheal patch
```

---

## ⚙️ Configuration

You can customize timeout thresholds and the audit output file path:

```typescript
import { SelfHealingEngine } from 'playwright-autoheal';

SelfHealingEngine.configure({
  auditFilePath: './artifacts/healing-ledger.json',
  primaryTimeoutMs: 1200,
  fallbackTimeoutMs: 2500,
  verbose: true,
});
```

Or pass `HEALING_AUDIT_FILE=/path/to/audit.json` via environment variables.

---

## 📄 License

MIT © [Md. Naimur Rahman Apu](https://github.com/naimuropu-cell)
