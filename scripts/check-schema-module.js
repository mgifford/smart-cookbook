#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { buildModule, OUTPUT_FILE } = require('./generate-schema-module');

const expected = buildModule();
let actual = '';
try {
  actual = fs.readFileSync(OUTPUT_FILE, 'utf8');
} catch (err) {
  console.error(`❌ Missing generated schema module: ${OUTPUT_FILE}`);
  console.error('   Run: npm run generate:schema-module');
  process.exit(1);
}

if (actual !== expected) {
  console.error('❌ src/generated/recipe-schema.js is stale.');
  console.error('   Run: npm run generate:schema-module');
  process.exit(1);
}

console.log('✅ Generated recipe schema module is synchronized.');
