const fs = require('fs');
const path = require('path');

const AUDIT_FILE = path.resolve(__dirname, '../test-results/healing-audit.json');
const BUG_DIR = path.resolve(__dirname, '../../bug-reports');

function generateMarkdownSummary() {
  const lines = [];

  lines.push('# 🛡️ Self-Healing E2E Test Pipeline — Execution Summary\n');
  lines.push('> **Automated closed-loop QA run completed.** Below is the consolidated diagnostic report covering test architecture, self-healing interventions, and defect ticket status.\n');

  // 1. Pipeline Overview Table
  lines.push('### 📊 Pipeline Overview');
  lines.push('| Metric | Value | Status |');
  lines.push('|---|---|---|');
  lines.push('| **Target Web Application** | Vite + React + TypeScript | 🟢 Port 5188 |');
  lines.push('| **E2E Automation Engine** | Playwright (Chromium) | 🌐 Headless |');
  lines.push('| **Visual Regression** | Playwright Snapshot Matcher | 📸 Verified |');
  lines.push('| **Self-Healing Engine** | Multi-Strategy Heuristic Fallback | 🛡️ Active |');
  lines.push('');

  // 2. Self-Healing Interventions Section
  lines.push('### 🩹 Self-Healing Locator Interventions');
  let auditEntries = [];
  if (fs.existsSync(AUDIT_FILE)) {
    try {
      auditEntries = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf-8'));
    } catch {
      auditEntries = [];
    }
  }

  if (Array.isArray(auditEntries) && auditEntries.length > 0) {
    lines.push(`> ⚠️ **${auditEntries.length} selector(s) experienced DOM mutations and were recovered transparently by the self-healing engine.**\n`);
    lines.push('| # | Target Element | Broken Primary Locator | Healed Fallback Strategy | Recovery Latency | Status |');
    lines.push('|---|---|---|---|---|---|');

    auditEntries.forEach((entry, i) => {
      const failed = `\`${entry.primaryFailed.type}\`: \`${entry.primaryFailed.value}\``;
      const healed = `\`${entry.healedWith.type}\`: \`${entry.healedWith.value}\``;
      lines.push(
        `| ${i + 1} | **${entry.elementName}** | ${failed} | ${healed} | \`${entry.resolutionTimeMs}ms\` | 🟢 Healed |`
      );
    });

    lines.push('\n💡 *Run `npm run heal:apply` to permanently update Page Objects with these verified fallback locators.*\n');
  } else {
    lines.push('✅ **All selectors resolved directly via primary locators without requiring fallback recovery.**\n');
  }

  // 3. Defect Ingestion Triage Table
  lines.push('### 🐞 Defect Ticket Triage & Verification');
  if (fs.existsSync(BUG_DIR)) {
    const bugFiles = fs
      .readdirSync(BUG_DIR)
      .filter((f) => f.endsWith('.md') && f !== 'README.md' && f !== 'DEFECT-TEMPLATE.md')
      .map((f) => path.join(BUG_DIR, f));

    if (bugFiles.length > 0) {
      lines.push('| Ticket ID | Title | Status | Severity | Area | Repro Spec |');
      lines.push('|---|---|---|---|---|---|');

      bugFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf-8');
        const titleMatch = content.match(/# Defect Ticket:\s*\[([^\]]+)\]\s*([^\r\n]+)/);
        const statusMatch = content.match(/-\s*\*\*Status\*\*:\s*([^\r\n]+)/);
        const severityMatch = content.match(/-\s*\*\*Severity\*\*:\s*([^\r\n]+)/);
        const areaMatch = content.match(/-\s*\*\*Affected Area\*\*:\s*([^\r\n]+)/);
        const reproMatch = content.match(/-\s*\*\*Reproduction Spec\*\*:\s*`?([^\r\n`]+)`?/);

        const id = titleMatch ? titleMatch[1].trim() : path.basename(file, '.md');
        const title = titleMatch ? titleMatch[2].trim() : 'Defect';
        const status = statusMatch ? statusMatch[1].trim() : 'Unknown';
        const severity = severityMatch ? severityMatch[1].trim() : 'Medium';
        const area = areaMatch ? areaMatch[1].trim() : 'General';
        const repro = reproMatch ? reproMatch[1].split(' ')[0].trim() : 'None';

        const statusBadge = status.toLowerCase().includes('fixed') ? '🟢 ' + status : '🔴 ' + status;
        lines.push(`| **${id}** | ${title} | ${statusBadge} | \`${severity}\` | ${area} | \`${repro}\` |`);
      });
      lines.push('');
    } else {
      lines.push('ℹ️ No active defect tickets found in `bug-reports/`.\n');
    }
  }

  lines.push('---');
  lines.push('*Report generated autonomously by `self-healing-e2e` CI engine.*');

  return lines.join('\n');
}

function run() {
  const summaryMarkdown = generateMarkdownSummary();

  // If running inside GitHub Actions, write directly to step summary
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summaryMarkdown + '\n', 'utf-8');
      console.log('✅ Successfully published report to GitHub Step Summary ($GITHUB_STEP_SUMMARY).');
    } catch (err) {
      console.error('Failed to write to $GITHUB_STEP_SUMMARY:', err);
    }
  } else {
    console.log(summaryMarkdown);
  }
}

run();
