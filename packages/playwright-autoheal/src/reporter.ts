import * as fs from 'fs';
import * as path from 'path';
import { HealingAuditEntry } from './types';
import { getDefaultAuditFilePath } from './engine';

export interface ReporterOptions {
  auditFilePath?: string;
}

/**
 * Reads audit log and renders a clean CLI summary.
 */
export function generateAuditReport(options: ReporterOptions = {}): {
  entries: HealingAuditEntry[];
  summaryText: string;
} {
  const auditFile = options.auditFilePath || getDefaultAuditFilePath();

  if (!fs.existsSync(auditFile)) {
    return {
      entries: [],
      summaryText: 'ℹ️ No healing events recorded. Tests ran cleanly on primary locators or test suite has not run yet.',
    };
  }

  let entries: HealingAuditEntry[] = [];
  try {
    entries = JSON.parse(fs.readFileSync(auditFile, 'utf-8'));
  } catch (err) {
    return {
      entries: [],
      summaryText: `❌ Failed to parse audit ledger at ${auditFile}`,
    };
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    return {
      entries: [],
      summaryText: 'ℹ️ Healing ledger is empty. Zero locators required self-healing.',
    };
  }

  const lines: string[] = [];
  lines.push('\n================================================================');
  lines.push('🛡️   PLAYWRIGHT-AUTOHEAL: SELF-HEALING AUDIT REPORT');
  lines.push('================================================================\n');
  lines.push(`Total Self-Healing Interventions: ${entries.length}\n`);

  entries.forEach((e, idx) => {
    lines.push(`[#${idx + 1}] Element: "${e.elementName}"`);
    lines.push(`     Primary Failed : [${e.primaryFailed.type}] "${e.primaryFailed.value}"`);
    lines.push(`     Healed With    : [${e.healedWith.type}] "${e.healedWith.value}"`);
    lines.push(`     Duration       : ${e.resolutionTimeMs}ms`);
    lines.push(`     Status         : ${e.status}`);
    lines.push(`     Page URL       : ${e.pageUrl}\n`);
  });

  return {
    entries,
    summaryText: lines.join('\n'),
  };
}
