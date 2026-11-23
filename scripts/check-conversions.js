#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { buildModule, OUTPUT_FILE } = require('./generate-conversions');

const expected = buildModule();
let actual = '';
try {
  actual = fs.readFileSync(OUTPUT_FILE, 'utf8');
} catch (err) {
  console.error(`❌ Missing generated conversion data: ${OUTPUT_FILE}`);
  console.error('   Run: npm run generate:conversions');
  process.exit(1);
}

if (actual !== expected) {
  console.error('❌ src/generated/conversions.js is stale.');
  console.error('   Run: npm run generate:conversions');
  process.exit(1);
}

console.log('✅ Generated conversion data is synchronized.');
