import * as fs from 'fs';
import * as path from 'path';
import { HealingAuditEntry } from './types';
import { getDefaultAuditFilePath } from './engine';

export interface PatcherOptions {
  auditFilePath?: string;
  targetDir?: string;
  verbose?: boolean;
}

export interface PatchResult {
  totalPatches: number;
  patchedFiles: string[];
  auditEntries: HealingAuditEntry[];
}

function getDefaultPagesDir(): string {
  if (process.env.HEALING_PAGES_DIR) {
    return path.resolve(process.env.HEALING_PAGES_DIR);
  }
  const cwd = process.cwd();
  if (path.basename(cwd) === 'tests' || path.basename(cwd) === 'test') {
    return path.resolve(cwd, 'pages');
  }
  return path.resolve(cwd, 'tests/pages');
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Scans TypeScript / JavaScript files in target directory and rewrites deprecated locators with verified healed alternatives.
 */
export function patchSourceFiles(options: PatcherOptions = {}): PatchResult {
  const auditFile = options.auditFilePath || getDefaultAuditFilePath();
  const targetDir = options.targetDir || getDefaultPagesDir();
  const verbose = options.verbose ?? true;

  if (verbose) {
    console.log('\n================================================================');
    console.log('🛠️   PLAYWRIGHT-AUTOHEAL: CODE PATCHER');
    console.log('================================================================\n');
  }

  if (!fs.existsSync(auditFile)) {
    if (verbose) {
      console.log(`ℹ️  No audit file found at "${auditFile}". Run tests first to record healed events.`);
    }
    return { totalPatches: 0, patchedFiles: [], auditEntries: [] };
  }

  let auditEntries: HealingAuditEntry[] = [];
  try {
    auditEntries = JSON.parse(fs.readFileSync(auditFile, 'utf-8'));
  } catch (err) {
    console.error('Failed to parse healing audit file:', err);
    return { totalPatches: 0, patchedFiles: [], auditEntries: [] };
  }

  if (!Array.isArray(auditEntries) || auditEntries.length === 0) {
    if (verbose) {
      console.log('ℹ️  Audit ledger is empty. No selectors require patching.');
    }
    return { totalPatches: 0, patchedFiles: [], auditEntries: [] };
  }

  if (!fs.existsSync(targetDir)) {
    if (verbose) {
      console.warn(`⚠️ Target directory does not exist: "${targetDir}"`);
    }
    return { totalPatches: 0, patchedFiles: [], auditEntries };
  }

  const files = fs
    .readdirSync(targetDir)
    .filter((file) => (file.endsWith('.ts') || file.endsWith('.js')) && !file.endsWith('.d.ts'))
    .map((file) => path.join(targetDir, file));

  if (verbose) {
    console.log(`🔍 Scanning ${files.length} file(s) in "${path.relative(process.cwd(), targetDir)}"...\n`);
  }

  let totalPatches = 0;
  const patchedFiles = new Set<string>();

  auditEntries.forEach((entry) => {
    const failedVal = entry.primaryFailed?.value;
    const healedVal = entry.healedWith?.value;

    if (!failedVal || !healedVal || failedVal === healedVal) return;

    files.forEach((filePath) => {
      let content = fs.readFileSync(filePath, 'utf-8');
      const relativePath = path.relative(process.cwd(), filePath);

      const primaryPattern = new RegExp(
        `(primary:\\s*\\{\\s*type:\\s*['"][^'"]+['"],\\s*value:\\s*['"])${escapeRegex(failedVal)}(['"])`,
        'g'
      );

      const testIdPattern = new RegExp(
        `(getByTestId\\(\\s*['"])${escapeRegex(failedVal)}(['"]\\))`,
        'g'
      );

      let fileModified = false;

      if (primaryPattern.test(content)) {
        content = content.replace(primaryPattern, `$1${healedVal}$2`);
        fileModified = true;
      }

      if (testIdPattern.test(content)) {
        content = content.replace(testIdPattern, `$1${healedVal}$2`);
        fileModified = true;
      }

      if (fileModified) {
        fs.writeFileSync(filePath, content, 'utf-8');
        totalPatches++;
        patchedFiles.add(relativePath);
        if (verbose) {
          console.log(`✅ [Patched] ${relativePath}`);
          console.log(`   Element:  "${entry.elementName}"`);
          console.log(`   Replaced: "${failedVal}" ➔ "${healedVal}"\n`);
        }
      }
    });
  });

  if (totalPatches > 0) {
    fs.writeFileSync(auditFile, JSON.stringify([], null, 2), 'utf-8');
    if (verbose) {
      console.log(`🎉 Successfully applied ${totalPatches} permanent patch(es) across ${patchedFiles.size} file(s).`);
      console.log('🧹 Cleared applied events from healing audit ledger.\n');
    }
  }

  return {
    totalPatches,
    patchedFiles: Array.from(patchedFiles),
    auditEntries,
  };
}
