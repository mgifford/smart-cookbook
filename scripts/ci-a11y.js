'use strict';

const { chromium } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const BASE_URL = process.env.BASE_URL || 'http://localhost:4173';

const logViolations = (violations) => {
  console.error(`Accessibility violations found: ${violations.length}`);
  violations.forEach((violation, index) => {
    console.error(`\n${index + 1}. [${violation.impact}] ${violation.help}`);
    console.error(`   Rule: ${violation.id}`);
    console.error(`   Help: ${violation.helpUrl}`);
    violation.nodes.slice(0, 5).forEach((node, nodeIdx) => {
      console.error(`   ${nodeIdx + 1}) ${node.target.join(' ')}`);
      if (node.failureSummary) console.error(`      ${node.failureSummary}`);
    });
    if (violation.nodes.length > 5) {
      console.error(`   ...and ${violation.nodes.length - 5} more nodes`);
    }
  });
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(750);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast']) // keep color issues for manual review to reduce CI noise
      .analyze();

    if (results.violations.length > 0) {
      logViolations(results.violations);
      await context.close();
      await browser.close();
      process.exit(1);
    }

    console.log('Accessibility scan passed (axe-core).');
    await context.close();
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Accessibility scan failed:', err);
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    process.exit(1);
  }
})();
