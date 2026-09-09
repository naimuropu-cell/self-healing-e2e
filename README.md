<div align="center">

# 🛡️ Self-Healing E2E Test Automation Pipeline

**An Autonomous, Closed-Loop QA Engine with Self-Healing Test Locators & Automated Defect Triage**

[![CI/CD Pipeline](https://github.com/naimuropu-cell/self-healing-e2e/actions/workflows/e2e.yml/badge.svg)](https://github.com/naimuropu-cell/self-healing-e2e/actions/workflows/e2e.yml)
[![Playwright](https://img.shields.io/badge/Playwright-v1.50-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![React](https://img.shields.io/badge/React-v18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-v6.1-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

---

## 🌟 Overview

`self-healing-e2e` is an autonomous Software Quality Assurance (QA) and test automation pipeline. It bridges the gap between fast-moving frontend evolution and reliable test automation by establishing a **closed-loop feedback cycle**:

1. **Target Web Application**: A full-featured modern e-commerce storefront (Vite + React + TypeScript) featuring Authentication, Product Catalog, Cart Drawer, and Checkout workflows.
2. **Playwright Test Suite**: Resilient, semantic E2E test journeys utilizing `data-testid` selectors and automatic dev server lifecycle management.
3. **Autonomous Self-Healing Loop**: Diagnoses broken UI tests resulting from DOM or locator mutations, applies self-healing locator strategies, and re-executes test suites until green.
4. **Autonomous Defect Ingestion**: Converts markdown defect specifications into reproducible Playwright tests, captures trace artifacts on failure, patches underlying bugs, and verifies resolutions.

---

## 🔄 Closed-Loop QA Architecture

```mermaid
flowchart LR
    A[Markdown Defect Spec\nbug-reports/] --> B[Autonomous QA Agent]
    B --> C[Script Reproduction Spec\ntests/e2e/reproductions/]
    C --> D[Execute Playwright Test]
    D -- Failure Captured --> E[Inspect Trace & DOM Snapshots]
    E --> F{Failure Type}
    F -- Broken Locator --> G[Self-Heal Test Selectors]
    F -- Application Bug --> H[Patch App Code in app/src/]
    G --> D
    H --> D
    D -- Tests Pass (Green) --> I[Update Defect Ticket & Commit]
```

---

## 📁 Repository Structure

```
self-healing-e2e/
├── app/                          # Target Web Application (Vite + React + TypeScript)
│   ├── src/
│   │   ├── App.tsx               # State-managed Auth, Catalog, Cart, & Checkout flows
│   │   ├── main.tsx              # Application entry point
│   │   ├── index.css             # Glassmorphic dark aesthetic & design tokens
│   │   └── types.ts              # Data contracts (User, Product, CartItem, Order)
│   ├── index.html
│   ├── vite.config.ts            # Vite server configured to port 5188
│   ├── tsconfig.json
│   └── package.json
│
├── tests/                        # E2E Test Automation Suite (Playwright + TypeScript)
│   ├── e2e/
│   │   └── checkout.spec.ts      # Full end-to-end shopping & checkout journey
│   ├── playwright.config.ts      # Automated webServer spawn, trace & video capture
│   └── package.json
│
├── bug-reports/                  # Defect Tracking & Autonomous Regression Harness
│   ├── README.md                 # Autonomous triage protocol and guidelines
│   └── DEFECT-TEMPLATE.md        # Standardized defect specification template
│
├── package.json                  # Monorepo root scripts
├── .gitignore                    # Production-grade git exclusion rules
└── README.md                     # Project documentation
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | React 18, TypeScript 5, Vite 6 |
| **Icons & Styling** | Lucide React, Vanilla CSS3 (Custom Design System, Glassmorphism) |
| **E2E Automation** | Playwright Test (Chromium / Firefox / WebKit) |
| **Diagnostics** | Playwright Trace Viewer, Video & Failure Screenshots |
| **Package Management** | npm monorepo workspaces / prefixed script execution |

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- [npm](https://www.npmjs.com/) (v9.0.0 or higher)

### 1. Clone the Repository
```bash
git clone https://github.com/naimuropu-cell/self-healing-e2e.git
cd self-healing-e2e
```

### 2. Install Dependencies
```bash
# Install target app dependencies
cd app && npm install

# Install test dependencies & Playwright browsers
cd ../tests && npm install
npx playwright install chromium

# Return to repository root
cd ..
```

---

## 💻 Available Scripts

Run these scripts from the repository root:

| Command | Description |
|---|---|
| `npm run dev` / `npm run app:dev` | Starts the target Vite application locally at `http://localhost:5188` |
| `npm run app:build` | Type-checks and compiles the target application for production |
| `npm test` / `npm run test:e2e` | Runs Playwright tests (automatically manages the dev server lifecycle) |
| `npm run test:e2e:ui` | Launches Playwright's interactive UI Test Runner |
| `npm run test:report` | Opens the latest Playwright HTML Test Report in your browser |

---

## 🧪 E2E Test Suite (`tests/`)

The primary test spec [checkout.spec.ts](tests/e2e/checkout.spec.ts) automates a comprehensive user scenario:

1. **Storefront Access**: Navigates to `http://localhost:5188` and verifies branding.
2. **Authentication**: Authenticates with test credentials (`demo_user` / `password123`).
3. **Catalog Interaction**: Browses hardware products and adds items to the cart.
4. **Cart Verification**: Asserts dynamic badge updates and item counts.
5. **Checkout Completion**: Fills shipping information and payment mock.
6. **Order Verification**: Asserts order confirmation screen and receipt ID (`ORD-XXXXXX`).

```bash
# Run tests headlessly
npm test

# Run tests with headed browser
npm --prefix tests run test:headed
```

---

## 🐞 Defect Tracking & Self-Healing Protocol

1. **File a Ticket**: Create a ticket inside `bug-reports/` using [`DEFECT-TEMPLATE.md`](bug-reports/DEFECT-TEMPLATE.md).
2. **Reproduce**: The Autonomous QA Engineer generates a reproduction test in `tests/e2e/reproductions/`.
3. **Diagnose**: Failures generate execution traces and DOM snapshots under `tests/test-results/`.
4. **Repair**:
   - **Locator Shift**: Automatically updates brittle selectors to resilient `data-testid` attributes.
   - **Functional Bug**: Repairs the component logic inside `app/src/`.
5. **Verify**: Tests are re-executed until 100% passing, followed by an automated commit and report.

---

## 👤 Author

**Md. Naimur Rahman Apu**
- GitHub: [@naimuropu-cell](https://github.com/naimuropu-cell)
- Email: [naimuropu@gmail.com](mailto:naimuropu@gmail.com)
- LinkedIn: [naimur-rahman-apu](https://www.linkedin.com/in/naimur-rahman-apu/)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
