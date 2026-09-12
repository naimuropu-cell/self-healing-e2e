#!/usr/bin/env node
import { patchSourceFiles } from '../patcher';
import { generateAuditReport } from '../reporter';
import { writeHtmlDashboard } from '../dashboard';
import { analyzeLocatorHealth } from '../health';

const args = process.argv.slice(2);
const command = args[0] || 'report';

if (command === 'patch' || command === 'apply') {
  patchSourceFiles();
} else if (command === 'report') {
  const { summaryText } = generateAuditReport();
  console.log(summaryText);
} else if (command === 'dashboard' || command === 'html') {
  const openFlag = args.includes('--open');
  const outIndex = args.indexOf('--out');
  const customOut = outIndex !== -1 && args[outIndex + 1] ? args[outIndex + 1] : undefined;
  const outPath = writeHtmlDashboard({ outputPath: customOut, autoOpen: openFlag });
  console.log(`\n🎉 Interactive Self-Healing Dashboard generated successfully!`);
  console.log(`📍 File: ${outPath}`);
  if (openFlag) {
    console.log('🌐 Opening report in default browser...\n');
  } else {
    console.log('💡 Pass --open to automatically launch your browser.\n');
  }
} else if (command === 'health' || command === 'audit') {
  const jsonFlag = args.includes('--json');
  const strictFlag = args.includes('--strict');
  const targetIndex = args.indexOf('--target');
  const customTarget = targetIndex !== -1 && args[targetIndex + 1] ? args[targetIndex + 1] : undefined;

  const result = analyzeLocatorHealth({
    targetDir: customTarget,
    strict: strictFlag,
  });

  if (jsonFlag) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(result.summaryText);
  }

  if (strictFlag && result.breakdown.critical > 0) {
    console.error(`❌ Strict audit failed: ${result.breakdown.critical} critical/brittle locator(s) found!\n`);
    process.exit(1);
  }
} else {
  console.log('Usage: npx playwright-autoheal [report|patch|dashboard|health] [options]');
  console.log('  report    : Display current self-healing audit log in terminal');
  console.log('  patch     : Automatically rewrite Page Objects with healed selectors');
  console.log('  dashboard : Generate interactive visual HTML telemetry dashboard');
  console.log('              --open   Launch report in browser');
  console.log('              --out    Custom output HTML filepath');
  console.log('  health    : Statically analyze selector resilience and flag brittle locators');
  console.log('              --target Directory to scan (default: tests/pages & tests/e2e)');
  console.log('              --strict Exit with non-zero code if critical locators found');
  console.log('              --json   Output raw JSON telemetry');
}
