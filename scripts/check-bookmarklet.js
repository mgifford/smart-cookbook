#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { buildFile, OUTPUT_FILE } = require('./build-bookmarklet');

const expected = buildFile();
let actual = '';
try {
  actual = fs.readFileSync(OUTPUT_FILE, 'utf8');
} catch (err) {
  console.error(`❌ Missing generated bookmarklet: ${OUTPUT_FILE}`);
  console.error('   Run: npm run build:bookmarklet');
  process.exit(1);
}

if (actual !== expected) {
  console.error('❌ bookmarklet.js is stale.');
  console.error('   Run: npm run build:bookmarklet');
  process.exit(1);
}

console.log('✅ Generated bookmarklet is synchronized.');
