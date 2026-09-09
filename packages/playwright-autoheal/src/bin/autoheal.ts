#!/usr/bin/env node
import { patchSourceFiles } from '../patcher';
import { generateAuditReport } from '../reporter';

const args = process.argv.slice(2);
const command = args[0] || 'report';

if (command === 'patch' || command === 'apply') {
  patchSourceFiles();
} else if (command === 'report') {
  const { summaryText } = generateAuditReport();
  console.log(summaryText);
} else {
  console.log('Usage: npx playwright-autoheal [report|patch]');
  console.log('  report : Display current self-healing audit log');
  console.log('  patch  : Automatically rewrite Page Objects with healed selectors');
}
