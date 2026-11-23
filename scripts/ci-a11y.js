'use strict';

const { chromium } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const http = require('http');
const path = require('path');
const fs = require('fs');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const ROOT_DIR = path.join(__dirname, '..');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.yaml': 'text/yaml; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon'
};

const startServer = (preferredPort = 4173) => new Promise((resolve, reject) => {
  const server = http.createServer((req, res) => {
    let urlPath;
    try {
      urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    } catch (_) {
      res.statusCode = 400;
      return res.end('Bad request');
    }
    const relative = urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, '');
    const filePath = path.resolve(ROOT_DIR, relative);

    if (!filePath.startsWith(ROOT_DIR + path.sep) && filePath !== path.join(ROOT_DIR, 'index.html')) {
      res.statusCode = 400;
      return res.end('Bad request');
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.statusCode = 404;
        return res.end('Not found');
      }
      const ext = path.extname(filePath).toLowerCase();
      res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
      res.end(data);
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && preferredPort === 4173) {
      server.listen(0, '127.0.0.1', () => resolve(server));
    } else {
      reject(err);
    }
  });
  server.listen(preferredPort, '127.0.0.1', () => resolve(server));
});

const violations = [];

const analyze = async (page, label) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  if (results.violations.length) {
    violations.push(...results.violations.map((violation) => ({ label, violation })));
  }
  const count = results.violations.reduce((sum, violation) => sum + violation.nodes.length, 0);
  console.log(`axe ${label}: ${results.violations.length} rule(s), ${count} node(s)`);
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const logViolations = () => {
  for (const { label, violation } of violations) {
    console.error(`\n[${label}] [${violation.impact}] ${violation.help}`);
    console.error(`Rule: ${violation.id}`);
    console.error(`Help: ${violation.helpUrl}`);
    violation.nodes.slice(0, 5).forEach((node, index) => {
      console.error(`  ${index + 1}) ${node.target.join(' ')}`);
      if (node.failureSummary) console.error(`     ${node.failureSummary.replace(/\n/g, ' ')}`);
    });
    if (violation.nodes.length > 5) {
      console.error(`  ...and ${violation.nodes.length - 5} more node(s)`);
    }
  }
};

(async () => {
  const shouldStartServer = /^http:\/\/(localhost|127\.0\.0\.1):4173/.test(BASE_URL);
  let server;
  let baseUrl = BASE_URL;
  let browser;

  try {
    if (shouldStartServer) {
      server = await startServer(4173);
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      console.log(`Started local static server on ${baseUrl}`);
    }

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`);
    });

    // Recipe view and deep link.
    await page.goto(`${baseUrl}/index.html?recipe=crispy-mushroom-mac-and-cheese`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => document.querySelectorAll('#recipe-select option').length > 0, null, { timeout: 15000 });
    assert(await page.inputValue('#recipe-select') === 'crispy-mushroom-mac-and-cheese', 'deep link did not select the recipe');
    assert((await page.locator('article h2').innerText()).includes('Crispy Mushroom'), 'recipe title did not render');
    assert(await page.locator('li.ingredient').count() >= 15, 'ingredients did not render');
    assert(await page.locator('ol li').count() >= 13, 'steps did not render');
    assert(await page.locator('details.recipe-notes').isVisible(), 'recipe notes are not discoverable');
    const bookmarkletHref = await page.locator('a:has-text("Save to Cookbook")').getAttribute('href');
    assert(bookmarkletHref && bookmarkletHref.startsWith('javascript:'), 'bookmarklet href is missing');
    assert(bookmarkletHref.includes('parseRecipeJsonLd'), 'bookmarklet does not use the shared scraper');

    await analyze(page, 'index.html desktop');

    // Experiment form and its interactive state.
    await page.locator('details.experiment-panel summary').click();
    await page.waitForTimeout(100);
    assert(await page.locator('#exp-date').isVisible(), 'experiment form did not open');
    await analyze(page, 'index.html experiment form');

    // Save and reload a local experiment.
    await page.selectOption('#exp-pan', 'flat_cast_iron');
    await page.selectOption('#exp-top', '4');
    await page.fill('#exp-notes', 'Playwright accessibility journey fixture.');
    await page.click('form.experiment-form button[type="submit"]');
    await page.waitForTimeout(150);
    assert((await page.locator('section').filter({ hasText: 'Cooking experiments' }).innerText()).includes('Saved locally'), 'experiment was not saved');
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => document.querySelectorAll('#recipe-select option').length > 0, null, { timeout: 15000 });
    assert(await page.inputValue('#recipe-select') === 'crispy-mushroom-mac-and-cheese', 'selected recipe did not persist across reload');
    const savedExperiments = await page.evaluate(() => JSON.parse(localStorage.getItem('cookbook-experiments') || '[]'));
    assert(savedExperiments.length === 1, 'experiment did not persist across reload');
    assert(savedExperiments[0].observations.top_crispness === 4, 'rating was not stored as a number');

    // Add a second experiment and check the comparison table state.
    await page.locator('details.experiment-panel summary').click();
    await page.selectOption('#exp-pan', 'ridged_cast_iron');
    await page.selectOption('#exp-bottom', '5');
    await page.click('form.experiment-form button[type="submit"]');
    await page.waitForTimeout(150);
    assert(await page.locator('table.experiment-table').isVisible(), 'experiment comparison table did not render');
    await analyze(page, 'index.html experiment comparison');

    // Keyboard scaling.
    await page.locator('#servings-slider').focus();
    const before = await page.locator('#servings-slider').inputValue();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);
    const after = await page.locator('#servings-slider').inputValue();
    assert(before !== after, 'servings slider did not respond to keyboard');

    // Reflow at 320 CSS pixels.
    await page.setViewportSize({ width: 320, height: 844 });
    await page.waitForTimeout(200);
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    assert(overflow.scrollWidth <= overflow.clientWidth, `index.html overflows at 320px (${overflow.scrollWidth} > ${overflow.clientWidth})`);
    await analyze(page, 'index.html 320px');

    // Invalid import error summary.
    await page.fill('#yaml-input', 'meta:\n  name: Invalid fixture\n');
    await page.click('button:has-text("Load YAML")');
    await page.waitForTimeout(100);
    assert(await page.locator('#import-errors').isVisible(), 'invalid import did not show an error summary');
    assert(await page.evaluate(() => document.activeElement && document.activeElement.id) === 'import-errors', 'import error summary did not receive focus');
    await analyze(page, 'index.html import errors');

    // Recipe browser: search, card, and direct link.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${baseUrl}/recipes-index.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => document.querySelectorAll('article .grid > div').length > 0, null, { timeout: 15000 });
    const cardCount = await page.locator('article .grid > div').count();
    assert(cardCount >= 11, `recipe browser rendered ${cardCount} cards`);

    await page.locator('#recipe-search').focus();
    await page.keyboard.type('Crispy');
    await page.waitForTimeout(150);
    assert(await page.locator('article .grid > div').count() === 1, 'recipe search did not filter to one card');
    const card = page.locator('article .grid > div').filter({ hasText: 'Crispy Mushroom' }).first();
    assert(await card.isVisible(), 'new recipe card is not visible');
    assert((await card.locator('a:has-text("View Recipe")').getAttribute('href')) === 'index.html?recipe=crispy-mushroom-mac-and-cheese', 'card deep link is wrong');

    await analyze(page, 'recipes-index.html desktop');

    await page.setViewportSize({ width: 320, height: 844 });
    await page.waitForTimeout(200);
    const browserOverflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    assert(browserOverflow.scrollWidth <= browserOverflow.clientWidth, `recipes-index.html overflows at 320px (${browserOverflow.scrollWidth} > ${browserOverflow.clientWidth})`);
    await analyze(page, 'recipes-index.html 320px');

    if (runtimeErrors.length) {
      throw new Error(`Runtime errors during journeys:\n${runtimeErrors.join('\n')}`);
    }

    if (violations.length) {
      logViolations();
      process.exitCode = 1;
    } else {
      console.log('Playwright journeys and axe checks passed.');
    }
  } catch (err) {
    console.error(`Accessibility/journey check failed: ${err.stack || err.message}`);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) server.close();
  }
})();
