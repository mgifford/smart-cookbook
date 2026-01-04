'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = process.env.SCAN_ROOT || path.resolve(__dirname, '..');

const isIgnored = (filePath) => {
  const segments = filePath.split(path.sep);
  return segments.includes('node_modules') || segments.includes('.git');
};

const collectHtmlFiles = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (isIgnored(fullPath)) continue;
    if (entry.isDirectory()) {
      files.push(...collectHtmlFiles(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
};

const checkHttpResources = (document, issues, file) => {
  const selectors = [
    ['script[src]', 'src'],
    ['link[href]', 'href'],
    ['img[src]', 'src'],
    ['iframe[src]', 'src'],
    ['audio[src]', 'src'],
    ['video[src]', 'src']
  ];
  selectors.forEach(([selector, attr]) => {
    document.querySelectorAll(selector).forEach((node) => {
      const value = node.getAttribute(attr) || '';
      if (value.startsWith('http://')) {
        issues.push({
          file,
          message: `${selector} uses insecure protocol: ${value}`
        });
      }
    });
  });
};

const checkInlineScripts = (document, issues, file) => {
  document.querySelectorAll('script').forEach((node, idx) => {
    const hasSrc = Boolean(node.getAttribute('src'));
    const inlineContent = (node.textContent || '').trim();
    if (!hasSrc && inlineContent.length > 0) {
      issues.push({
        file,
        message: `Inline script detected (script #${idx + 1})` 
      });
    }
  });
};

const checkRelNoopener = (document, issues, file) => {
  document.querySelectorAll('a[target="_blank"]').forEach((node, idx) => {
    const rel = (node.getAttribute('rel') || '').toLowerCase();
    if (!rel.includes('noopener') && !rel.includes('noreferrer')) {
      const href = node.getAttribute('href') || '';
      issues.push({
        file,
        message: `Link target=_blank missing rel="noopener" (link #${idx + 1} href=${href})`
      });
    }
  });
};

const scanFile = (file) => {
  const html = fs.readFileSync(file, 'utf8');
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const issues = [];

  checkInlineScripts(document, issues, file);
  checkHttpResources(document, issues, file);
  checkRelNoopener(document, issues, file);

  return issues;
};

const run = () => {
  const htmlFiles = collectHtmlFiles(ROOT);
  const issues = htmlFiles.flatMap(scanFile);

  if (issues.length) {
    console.error(`Security scan failed with ${issues.length} issue(s):`);
    issues.forEach((issue, idx) => {
      console.error(`${idx + 1}. ${issue.file}: ${issue.message}`);
    });
    process.exit(1);
  }

  console.log(`Security scan passed on ${htmlFiles.length} HTML file(s).`);
};

run();
