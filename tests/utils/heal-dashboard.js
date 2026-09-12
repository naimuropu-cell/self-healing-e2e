const path = require('path');
const { writeHtmlDashboard } = require('../../packages/playwright-autoheal/dist');

function main() {
  const args = process.argv.slice(2);
  const openFlag = args.includes('--open');
  const outIndex = args.indexOf('--out');
  const customOut = outIndex !== -1 && args[outIndex + 1] ? path.resolve(args[outIndex + 1]) : undefined;

  console.log('\n================================================================');
  console.log('📊   AUTONOMOUS QA: INTERACTIVE SELF-HEALING DASHBOARD');
  console.log('================================================================\n');

  try {
    const outPath = writeHtmlDashboard({
      outputPath: customOut,
      autoOpen: openFlag,
    });

    console.log('🎉 Interactive Self-Healing Dashboard generated successfully!');
    console.log('📍 File Path : ' + outPath);
    if (openFlag) {
      console.log('🌐 Launching report in your default browser...\n');
    } else {
      console.log('💡 Tip: Pass --open to automatically launch your browser.\n');
    }
  } catch (err) {
    console.error('❌ Failed to generate HTML dashboard:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
