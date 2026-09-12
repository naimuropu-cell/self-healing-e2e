#!/usr/bin/env node
import { patchSourceFiles } from '../patcher';
import { generateAuditReport } from '../reporter';
import { writeHtmlDashboard } from '../dashboard';

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
} else {
  console.log('Usage: npx playwright-autoheal [report|patch|dashboard] [options]');
  console.log('  report    : Display current self-healing audit log in terminal');
  console.log('  patch     : Automatically rewrite Page Objects with healed selectors');
  console.log('  dashboard : Generate interactive visual HTML telemetry dashboard');
  console.log('              --open   Launch report in browser');
  console.log('              --out    Custom output HTML filepath');
}
