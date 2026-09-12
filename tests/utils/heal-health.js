const path = require('path');
const { analyzeLocatorHealth } = require('../../packages/playwright-autoheal/dist');

function main() {
  const args = process.argv.slice(2);
  const jsonFlag = args.includes('--json');
  const strictFlag = args.includes('--strict');
  const targetIndex = args.indexOf('--target');
  const customTarget = targetIndex !== -1 && args[targetIndex + 1] ? path.resolve(args[targetIndex + 1]) : undefined;

  const minScoreIndex = args.indexOf('--min-score');
  const minScore = minScoreIndex !== -1 && args[minScoreIndex + 1] ? parseInt(args[minScoreIndex + 1], 10) : undefined;

  const summary = analyzeLocatorHealth({
    targetDir: customTarget,
    strict: strictFlag,
    minScore,
  });

  if (jsonFlag) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(summary.summaryText);
  }

  if (minScore && summary.overallScore < minScore) {
    console.error(`❌ Failure: Overall health score ${summary.overallScore} is below minimum threshold of ${minScore}.\n`);
    process.exit(1);
  }

  if (strictFlag && (summary.breakdown.critical > 0 || summary.breakdown.brittle > 0)) {
    console.error(`❌ Strict audit failed: Found ${summary.breakdown.critical} critical and ${summary.breakdown.brittle} brittle locator(s).\n`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
