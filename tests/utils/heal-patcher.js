const fs = require('fs');
const path = require('path');

const AUDIT_FILE = path.resolve(__dirname, '../test-results/healing-audit.json');
const PAGES_DIR = path.resolve(__dirname, '../pages');

function runPatcher() {
  console.log('\n================================================================');
  console.log('🛠️   AUTONOMOUS QA: SELF-HEALING AUTO-PATCHER');
  console.log('================================================================\n');

  if (!fs.existsSync(AUDIT_FILE)) {
    console.log('ℹ️  No healing audit entries found. Run `npm test` first to detect healed locators.');
    return;
  }

  let auditEntries = [];
  try {
    auditEntries = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf-8'));
  } catch (err) {
    console.error('Failed to parse healing-audit.json:', err);
    return;
  }

  if (!Array.isArray(auditEntries) || auditEntries.length === 0) {
    console.log('ℹ️  Audit ledger is empty. No selectors currently require patching.');
    return;
  }

  const pageFiles = fs
    .readdirSync(PAGES_DIR)
    .filter((file) => file.endsWith('.ts') && !file.endsWith('.d.ts'))
    .map((file) => path.join(PAGES_DIR, file));

  console.log(`🔍 Scanning ${pageFiles.length} Page Object files for deprecated locators...\n`);

  let totalPatches = 0;
  const patchedFiles = new Set();

  auditEntries.forEach((entry) => {
    const failedVal = entry.primaryFailed.value;
    const healedVal = entry.healedWith.value;

    if (!failedVal || !healedVal || failedVal === healedVal) {
      return;
    }

    pageFiles.forEach((filePath) => {
      let content = fs.readFileSync(filePath, 'utf-8');
      const relativePath = path.relative(process.cwd(), filePath);

      // Pattern 1: primary: { type: '...', value: 'oldValue' }
      const primaryPattern = new RegExp(
        `(primary:\\s*\\{\\s*type:\\s*['"][^'"]+['"],\\s*value:\\s*['"])${escapeRegex(failedVal)}(['"])`,
        'g'
      );

      // Pattern 2: direct getByTestId('oldValue')
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
        console.log(`✅ [Patched] ${relativePath}`);
        console.log(`   Element:  "${entry.elementName}"`);
        console.log(`   Replaced: "${failedVal}" ➔ "${healedVal}"\n`);
      }
    });
  });

  if (totalPatches > 0) {
    // Clear or archive applied entries
    fs.writeFileSync(AUDIT_FILE, JSON.stringify([], null, 2), 'utf-8');
    console.log(`🎉 Successfully applied ${totalPatches} permanent patch(es) across ${patchedFiles.size} file(s).`);
    console.log('🧹 Cleared applied events from healing audit ledger.');
    console.log('🚀 Next `npm test` will now resolve directly on the primary locator without fallback delay.\n');
  } else {
    console.log('ℹ️  No matching Page Object selectors found for pending audit entries.');
  }

  return {
    totalPatches,
    patchedFiles: Array.from(patchedFiles),
    auditEntries,
  };
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

if (require.main === module) {
  runPatcher();
}

module.exports = { runPatcher };

