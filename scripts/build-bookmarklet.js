#!/usr/bin/env node
'use strict';

/**
 * Generate the published bookmarklet from the single source module.
 * Run: node scripts/build-bookmarklet.js
 */

const fs = require('fs');
const path = require('path');
const { buildBookmarkletCode } = require('../src/bookmarklet/recipe-scraper');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT, 'bookmarklet.js');
const HEADER = `// Generated from src/bookmarklet/recipe-scraper.js by scripts/build-bookmarklet.js.
// Copy everything after "javascript:" into a browser bookmark URL.
// The source is loaded by index.html; do not edit this generated file by hand.

`;

function buildFile() {
  return HEADER + buildBookmarkletCode() + '\n';
}

function main() {
  fs.writeFileSync(OUTPUT_FILE, buildFile());
  console.log(`Generated ${path.relative(ROOT, OUTPUT_FILE)}`);
}

if (require.main === module) main();
module.exports = { buildFile, OUTPUT_FILE };
