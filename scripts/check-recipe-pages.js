#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { buildPages } = require('./generate-recipe-pages');

const ROOT = path.resolve(__dirname, '..');
const pages = buildPages();
const errors = [];

for (const page of pages) {
  const relative = path.relative(ROOT, page.file);
  if (!fs.existsSync(page.file)) {
    errors.push(`missing ${relative}`);
    continue;
  }
  if (fs.readFileSync(page.file, 'utf8') !== page.html) errors.push(`stale ${relative}`);
}

const expected = new Set(pages.map((page) => path.resolve(page.file)));
for (const file of fs.readdirSync(path.join(ROOT, 'recipes'))) {
  if (!file.endsWith('.html')) continue;
  const full = path.join(ROOT, 'recipes', file);
  if (!expected.has(full)) errors.push(`orphaned recipes/${file}`);
}

if (errors.length) {
  console.error('❌ Static recipe pages are out of date:');
  errors.forEach((error) => console.error(`- ${error}`));
  console.error('   Run: npm run generate:recipe-pages');
  process.exit(1);
}

console.log(`✅ ${pages.length} static recipe page(s) are synchronized.`);
