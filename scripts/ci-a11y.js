'use strict';

const { chromium } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const http = require('http');
const path = require('path');
const fs = require('fs');

const BASE_URL = process.env.BASE_URL || 'http://localhost:4173';
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

const startServer = (port = 4173) => new Promise((resolve, reject) => {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const relative = urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, '');
    const filePath = path.join(ROOT_DIR, relative);

    // Prevent path traversal
    if (!filePath.startsWith(ROOT_DIR)) {
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

  server.on('error', reject);
  server.listen(port, () => resolve(server));
});

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
  const shouldStartServer = BASE_URL.startsWith('http://localhost:4173');
  let server;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    if (shouldStartServer) {
      server = await startServer(4173);
      console.log('Started local static server on http://localhost:4173');
    }

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
    if (server) server.close();
    process.exit(0);
  } catch (err) {
    console.error('Accessibility scan failed:', err);
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    if (server) server.close();
    process.exit(1);
  }
})();
