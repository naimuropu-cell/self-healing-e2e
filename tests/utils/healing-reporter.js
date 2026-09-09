const fs = require('fs');
const path = require('path');

const AUDIT_FILE = path.resolve(__dirname, '../test-results/healing-audit.json');

function displayReport() {
  console.log('\n================================================================');
  console.log('🛡️   AUTONOMOUS QA: SELF-HEALING LOCATOR AUDIT REPORT');
  console.log('================================================================\n');

  if (!fs.existsSync(AUDIT_FILE)) {
    console.log('No healing events recorded yet. Run `npm test` to evaluate.');
    return;
  }

  try {
    const data = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf-8'));
    if (!Array.isArray(data) || data.length === 0) {
      console.log('Audit ledger is empty. All locators resolved cleanly.');
      return;
    }

    console.log(`📊 Total Self-Healed Interventions: ${data.length}\n`);

    data.forEach((entry, idx) => {
      console.log(`[#${idx + 1}] Target: "${entry.elementName}"`);
      console.log(`  ⏱️  Timestamp:       ${entry.timestamp}`);
      console.log(`  ❌ Failed Primary:  [${entry.primaryFailed.type}] "${entry.primaryFailed.value}"`);
      console.log(`  ✅ Healed Fallback: [${entry.healedWith.type}] "${entry.healedWith.value}"`);
      console.log(`  ⚡ Recovery Time:   ${entry.resolutionTimeMs}ms`);
      console.log(`  🌐 Page URL:        ${entry.pageUrl}`);
      console.log('----------------------------------------------------------------');
    });

    console.log('\n💡 Recommendation: Permanently patch Page Objects with healed fallback values.\n');
  } catch (err) {
    console.error('Error reading healing audit ledger:', err);
  }
}

displayReport();
