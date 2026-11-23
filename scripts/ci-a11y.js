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
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      permissions: ['clipboard-read', 'clipboard-write']
    });
    await context.addInitScript(() => {
      try { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); } catch (_) {}
    });
    const page = await context.newPage();

    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`);
    });

    // Home page: shareable concept, recipe library, and technical tools.
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => document.querySelectorAll('.recipe-card').length >= 11, null, { timeout: 15000 });
    assert(await page.locator('#home').isVisible(), 'home hero did not render');
    assert(await page.locator('article#recipe').isVisible() === false, 'recipe view should be hidden on the home page');
    assert(await page.locator('#recipe-select').isVisible() === false, 'recipe controls should be hidden on the home page');
    assert(await page.locator('#bookmarklet').isVisible(), 'bookmarklet should be on the home page');
    assert(await page.locator('#yaml-input').isVisible(), 'YAML import/export should be on the home page');
    const firstCard = page.locator('.recipe-card').first();
    assert((await firstCard.getAttribute('href')).includes('?recipe='), 'home recipe card is not a direct recipe link');

    // The skip link is the first stop and lands in main content.
    await page.keyboard.press('Tab');
    assert(await page.evaluate(() => document.activeElement && document.activeElement.className) === 'skip-link', 'skip link is not the first focusable control');
    assert(await page.locator('.skip-link').isVisible(), 'skip link is not visible on focus');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    assert(await page.evaluate(() => document.activeElement && document.activeElement.id) === 'main-content', 'skip link did not focus main content');

    await analyze(page, 'index.html home');

    // Deep link: one recipe, with a section anchor.
    await page.goto(`${baseUrl}/index.html?recipe=crispy-mushroom-mac-and-cheese#ingredients`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => document.querySelectorAll('#recipe-select option').length > 0, null, { timeout: 15000 });
    assert(await page.inputValue('#recipe-select') === 'crispy-mushroom-mac-and-cheese', 'deep link did not select the recipe');
    assert(await page.locator('article#recipe').isVisible(), 'deep link did not show the recipe');
    assert(await page.locator('#home').isVisible() === false, 'home should be hidden on a recipe page');
    assert(await page.locator('#bookmarklet').isVisible() === false, 'bookmarklet should not appear on a recipe page');
    assert(await page.locator('#yaml-input').isVisible() === false, 'YAML import/export should not appear on a recipe page');
    assert((await page.locator('#recipe-title').innerText()).includes('Crispy Mushroom'), 'recipe title did not render');
    assert(await page.locator('li.ingredient').count() >= 15, 'ingredients did not render');
    assert(await page.locator('ol li').count() >= 13, 'steps did not render');
    assert(await page.locator('details.recipe-notes').isVisible(), 'recipe notes are not discoverable');
    assert(await page.locator('a.permalink').count() >= 5, 'recipe section permalinks are missing');
    assert(await page.locator('.recipe-toc a').count() >= 5, 'recipe table of contents is missing');
    await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'ingredients', null, { timeout: 5000 });
    assert(await page.evaluate(() => location.hash) === '#ingredients', 'initial section hash was not preserved');

    await analyze(page, 'index.html recipe');

    // A visible section link updates the URL and moves focus.
    await page.locator('.recipe-toc a[href="#steps"]').click();
    await page.waitForTimeout(150);
    assert(await page.evaluate(() => location.hash) === '#steps', 'TOC anchor did not update the URL');
    assert(await page.evaluate(() => document.activeElement && document.activeElement.id) === 'steps', 'TOC anchor did not move focus');

    // Share the current section, not just the site root.
    await page.click('button:has-text("Share recipe")');
    await page.waitForTimeout(200);
    const sharedUrl = await page.evaluate(() => navigator.clipboard.readText());
    assert(sharedUrl.includes('?recipe=crispy-mushroom-mac-and-cheese#steps'), `shared URL was not section-specific: ${sharedUrl}`);
    assert((await page.locator('.share-status').innerText()).includes('copied'), 'share confirmation was not announced');

    // A deep link into the closed notes disclosure opens it and focuses its summary.
    await page.goto(`${baseUrl}/index.html?recipe=crispy-mushroom-mac-and-cheese#notes`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => document.querySelectorAll('#recipe-select option').length > 0, null, { timeout: 15000 });
    await page.waitForFunction(() => document.querySelector('details#notes')?.open === true, null, { timeout: 5000 });
    assert(await page.evaluate(() => document.activeElement && document.activeElement.tagName) === 'SUMMARY', 'notes deep link did not focus the summary');

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

    // Reflow at 320 CSS pixels on the recipe page.
    await page.setViewportSize({ width: 320, height: 844 });
    await page.waitForTimeout(200);
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    assert(overflow.scrollWidth <= overflow.clientWidth, `index.html recipe overflows at 320px (${overflow.scrollWidth} > ${overflow.clientWidth})`);
    await analyze(page, 'index.html recipe 320px');

    // Technical import tools are on the home page.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.locator('a.brand-link').click();
    await page.waitForTimeout(250);
    assert(await page.locator('#home').isVisible(), 'brand link did not return to the home page');
    assert(await page.locator('#yaml-input').isVisible(), 'YAML import/export is not on the home page');
    await page.fill('#yaml-input', 'meta:\n  name: Invalid fixture\n');
    await page.click('button:has-text("Load YAML")');
    await page.waitForTimeout(100);
    assert(await page.locator('#import-errors').isVisible(), 'invalid import did not show an error summary');
    assert(await page.evaluate(() => document.activeElement && document.activeElement.id) === 'import-errors', 'import error summary did not receive focus');
    await analyze(page, 'index.html home import errors');

    // Home reflow.
    await page.setViewportSize({ width: 320, height: 844 });
    await page.waitForTimeout(200);
    const homeOverflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    assert(homeOverflow.scrollWidth <= homeOverflow.clientWidth, `home overflows at 320px (${homeOverflow.scrollWidth} > ${homeOverflow.clientWidth})`);
    await analyze(page, 'index.html home 320px');

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
