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

// JSDOM does not include <template> content in document.querySelectorAll.
// Collect the document and every template fragment so dynamic markup is scanned.
const collectRoots = (root) => {
  const roots = [root];
  root.querySelectorAll('template').forEach((template) => {
    roots.push(template.content);
    roots.push(...collectRoots(template.content));
  });
  return roots;
};

const checkInsecureResources = (root, issues, file) => {
  const selectors = [
    ['script[src]', 'src'],
    ['link[href]', 'href'],
    ['img[src]', 'src'],
    ['iframe[src]', 'src'],
    ['audio[src]', 'src'],
    ['video[src]', 'src']
  ];
  selectors.forEach(([selector, attr]) => {
    root.querySelectorAll(selector).forEach((node) => {
      const value = node.getAttribute(attr) || '';
      if (value.startsWith('http://') || value.startsWith('//')) {
        issues.push({ file, message: `${selector} uses an insecure or protocol-relative resource: ${value}` });
      }
    });
  });
};

const checkExternalIntegrity = (root, issues, file) => {
  root.querySelectorAll('script[src], link[rel="stylesheet"][href], link[rel="preload"][href], link[rel="modulepreload"][href]').forEach((node) => {
    const value = node.getAttribute('src') || node.getAttribute('href') || '';
    if (!/^https?:\/\//i.test(value)) return;
    if (!node.getAttribute('integrity')) {
      issues.push({ file, message: `External resource missing Subresource Integrity: ${value}` });
    }
    if (!node.getAttribute('crossorigin')) {
      issues.push({ file, message: `External resource missing crossorigin attribute: ${value}` });
    }
  });
};

const checkInlineScripts = (root, issues, file) => {
  root.querySelectorAll('script').forEach((node, idx) => {
    const hasSrc = Boolean(node.getAttribute('src'));
    const inlineContent = (node.textContent || '').trim();
    if (!hasSrc && inlineContent.length > 0) {
      issues.push({ file, message: `Inline script detected (script #${idx + 1})` });
    }
  });
};

const checkRelNoopener = (root, issues, file) => {
  root.querySelectorAll('a[target="_blank"]').forEach((node, idx) => {
    const rel = (node.getAttribute('rel') || '').toLowerCase();
    if (!rel.includes('noopener') && !rel.includes('noreferrer')) {
      const href = node.getAttribute('href') || '';
      issues.push({ file, message: `Link target=_blank missing rel="noopener" (link #${idx + 1} href=${href})` });
    }
  });
};

const checkJavascriptLinks = (root, issues, file) => {
  root.querySelectorAll('a[href]').forEach((node) => {
    const href = (node.getAttribute('href') || '').trim().toLowerCase();
    if (href.startsWith('javascript:')) {
      issues.push({ file, message: `Static javascript: link detected (${href.slice(0, 80)})` });
    }
  });
};

const scanFile = (file) => {
  const html = fs.readFileSync(file, 'utf8');
  const dom = new JSDOM(html);
  const roots = collectRoots(dom.window.document);
  const issues = [];

  roots.forEach((root) => {
    checkInlineScripts(root, issues, file);
    checkInsecureResources(root, issues, file);
    checkExternalIntegrity(root, issues, file);
    checkRelNoopener(root, issues, file);
    checkJavascriptLinks(root, issues, file);
  });

  // Deduplicate messages produced by nested template traversal.
  const seen = new Set();
  return issues.filter((issue) => {
    const key = `${issue.file}::${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const run = () => {
  const htmlFiles = collectHtmlFiles(ROOT);
  const issues = htmlFiles.flatMap(scanFile);

  if (issues.length) {
    console.error(`Security scan failed with ${issues.length} issue(s):`);
    issues.forEach((issue, idx) => {
      console.error(`${idx + 1}. ${path.relative(ROOT, issue.file)}: ${issue.message}`);
    });
    process.exit(1);
  }

  console.log(`Security scan passed on ${htmlFiles.length} HTML file(s), including template content.`);
};

run();
