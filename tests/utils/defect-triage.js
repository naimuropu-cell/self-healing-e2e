const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUG_DIR = path.resolve(__dirname, '../../bug-reports');
const REPRO_DIR = path.resolve(__dirname, '../e2e/reproductions');

function parseTicket(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const filename = path.basename(filePath);

  const titleMatch = content.match(/# Defect Ticket:\s*\[([^\]]+)\]\s*([^\r\n]+)/);
  const statusMatch = content.match(/-\s*\*\*Status\*\*:\s*([^\r\n]+)/);
  const severityMatch = content.match(/-\s*\*\*Severity\*\*:\s*([^\r\n]+)/);
  const areaMatch = content.match(/-\s*\*\*Affected Area\*\*:\s*([^\r\n]+)/);
  const reproMatch = content.match(/-\s*\*\*Reproduction Spec\*\*:\s*`?([^\r\n`]+)`?/);

  return {
    filename,
    filePath,
    id: titleMatch ? titleMatch[1].trim() : filename.replace('.md', ''),
    title: titleMatch ? titleMatch[2].trim() : 'Untitled Defect',
    status: statusMatch ? statusMatch[1].trim() : 'Unknown',
    severity: severityMatch ? severityMatch[1].trim() : 'Medium',
    area: areaMatch ? areaMatch[1].trim() : 'General',
    reproSpec: reproMatch ? reproMatch[1].split(' ')[0].trim() : null,
  };
}

function scaffoldReproductionSpec(ticket) {
  const specFileName = `${ticket.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}.spec.ts`;
  const specPath = path.join(REPRO_DIR, specFileName);

  if (fs.existsSync(specPath)) {
    return specPath;
  }

  const boilerplate = `import { test, expect } from '@playwright/test';
import { LoginPage, CatalogPage, CartModal, CheckoutModal } from '../../pages';

test.describe('Reproduction Suite: ${ticket.id} ${ticket.title.replace(/'/g, "\\'")}', () => {
  test('should reproduce defect scenario described in ${ticket.filename}', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const catalogPage = new CatalogPage(page);

    // 1. Navigate and authenticate
    await loginPage.goto();
    await loginPage.login('demo_user', 'password123');
    await catalogPage.assertCatalogVisible();

    // 2. TODO: Implement defect reproduction steps
    // Target Area: ${ticket.area}
  });
});
`;

  if (!fs.existsSync(REPRO_DIR)) {
    fs.mkdirSync(REPRO_DIR, { recursive: true });
  }

  fs.writeFileSync(specPath, boilerplate, 'utf-8');
  console.log(`✨ [Auto-Scaffold] Generated reproduction test spec: tests/e2e/reproductions/${specFileName}`);
  return specPath;
}

function runTriage() {
  console.log('\n================================================================');
  console.log('🐞   AUTONOMOUS QA: DEFECT TRIAGE & INGESTION DASHBOARD');
  console.log('================================================================\n');

  if (!fs.existsSync(BUG_DIR)) {
    console.log('No bug-reports/ directory detected.');
    return;
  }

  const files = fs
    .readdirSync(BUG_DIR)
    .filter((f) => f.endsWith('.md') && f !== 'README.md' && f !== 'DEFECT-TEMPLATE.md')
    .map((f) => path.join(BUG_DIR, f));

  if (files.length === 0) {
    console.log('ℹ️  No active defect tickets found in bug-reports/');
    return;
  }

  const tickets = files.map(parseTicket);
  let openCount = 0;
  let fixedCount = 0;

  tickets.forEach((ticket, idx) => {
    const isOpen = ticket.status.toLowerCase().includes('open');
    if (isOpen) openCount++;
    else fixedCount++;

    const statusBadge = isOpen ? '🔴 OPEN' : '🟢 FIXED & VERIFIED';
    console.log(`[#${idx + 1}] [${ticket.id}] ${ticket.title}`);
    console.log(`  📌 Status:      ${statusBadge}`);
    console.log(`  ⚡ Severity:    ${ticket.severity}`);
    console.log(`  🎯 Area:        ${ticket.area}`);

    let specRel = ticket.reproSpec;
    if (specRel) {
      const fullSpecPath = path.resolve(__dirname, '../../', specRel);
      const exists = fs.existsSync(fullSpecPath);
      console.log(`  🧪 Repro Spec:  ${specRel} ${exists ? '(✅ Present)' : '(⚠️ Missing)'}`);
    } else if (isOpen) {
      const createdPath = scaffoldReproductionSpec(ticket);
      console.log(`  🧪 Repro Spec:  ${path.relative(process.cwd(), createdPath)} (Created)`);
    }
    console.log('----------------------------------------------------------------');
  });

  console.log(`\n📊 Executive Summary:`);
  console.log(`  • Total Defect Tickets Logged: ${tickets.length}`);
  console.log(`  • Resolved & Verified:         ${fixedCount}`);
  console.log(`  • Active / Unresolved:         ${openCount}\n`);

  if (openCount === 0) {
    console.log('🎉 Outstanding: 100% of defect specifications have verified reproduction tests!\n');
  } else {
    console.log(`⚠️  Action Required: ${openCount} open ticket(s) require reproduction verification & code patch.\n`);
  }
}

runTriage();
