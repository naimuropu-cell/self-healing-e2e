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

## 🎭 Custom Playwright Fixture (`autoheal`)

Instead of explicitly wrapping every action with `SelfHealingEngine.click(page, ...)`, `playwright-autoheal` provides a custom fixture and transparent proxy that extends Playwright's `test`:

```typescript
import { test as base, expect } from '@playwright/test';
import { extendWithAutoHeal, SelfHealingDescriptor } from 'playwright-autoheal';

// Extend base Playwright test with autoheal fixture
const test = extendWithAutoHeal(base);

test('transparent self-healing via fixture', async ({ autoheal }) => {
  // Use all standard Page methods seamlessly:
  await autoheal.goto('/');

  // Pass either SelfHealingDescriptors or native strings:
  const submitDescriptor: SelfHealingDescriptor = {
    name: 'Submit Button',
    primary: { type: 'testid', value: 'stale-submit-btn' },
    fallbacks: [{ type: 'role', value: 'button', options: { name: 'Submit' } }]
  };

  // Resilient click (auto-routed to SelfHealingEngine):
  await autoheal.click(submitDescriptor);

  // Or resolve to native Playwright Locator:
  const locator = await autoheal.heal(submitDescriptor);
  await expect(locator).toBeVisible();
});
```

---

## 🤖 AI-Powered Semantic Locator Recovery

When all deterministic fallbacks fail, `playwright-autoheal` triggers **Phase 3 AI Semantic Recovery**:

```typescript
const descriptor: SelfHealingDescriptor = {
  name: 'Submit Order Button',
  primary: { type: 'testid', value: 'broken-selector' },
  fallbacks: [{ type: 'css', value: '.non-existent-class' }],
  aiHint: 'Final purchase confirmation button in checkout modal',
};

// If all fallbacks fail, AI inspects visible DOM candidates and recovers the element!
await SelfHealingEngine.click(page, descriptor);
```

### Dual-Mode Architecture
1. **Remote LLM Adapter**: Set `GEMINI_API_KEY` (Gemini 1.5/2.0) or `OPENAI_API_KEY` (GPT-4o-mini) to query frontier LLMs for element disambiguation.
2. **Embedded Local Semantic Engine**: Built-in zero-dependency intent ranking and token similarity model. Works offline and in CI/CD without API keys!

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


## 📊 Interactive HTML Telemetry Dashboard

`playwright-autoheal` includes a built-in visual HTML telemetry dashboard generator:

```bash
# CLI usage
npx playwright-autoheal dashboard --open
```

Programmatic usage:

```typescript
import { writeHtmlDashboard } from 'playwright-autoheal';

const reportPath = writeHtmlDashboard({
  autoOpen: true,
  title: 'Custom Telemetry Report',
});
```


## 🏥 Locator Health & Fragility Scoring

Audit selectors and Page Objects for brittle patterns:

```bash
# Run health audit via CLI
npx playwright-autoheal health

# Audit specific directory with strict failure policy
npx playwright-autoheal health --target tests/pages --strict
```

Programmatic usage:

```typescript
import { analyzeLocatorHealth, scoreSelector } from 'playwright-autoheal';

// Single selector scoring
const evaluation = scoreSelector('div > div:nth-child(2) > button', 'css');
console.log(evaluation.score); // 40 (BRITTLE)
console.log(evaluation.issues); // ['Deep CSS nesting...', 'Positional index...']

// Directory health audit
const summary = analyzeLocatorHealth({ targetDir: 'tests/pages' });
console.log(`Grade: ${summary.grade} (${summary.overallScore}/100)`);
```
