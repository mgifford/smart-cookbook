#!/usr/bin/env node
'use strict';

/**
 * Fail when recipes.json is not synchronized with the YAML recipe source.
 * Run: node scripts/check-index.js
 */

const fs = require('fs');
const path = require('path');
const { buildRecipeIndex, DEFAULT_ROOT } = require('./lib/recipe-index');

const INDEX_FILE = path.join(DEFAULT_ROOT, 'recipes.json');

function main() {
  let actual;
  try {
    actual = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  } catch (err) {
    console.error(`❌ recipes.json is missing or invalid: ${err.message}`);
    process.exit(1);
  }

  let expected;
  try {
    expected = buildRecipeIndex();
  } catch (err) {
    console.error(`❌ Could not build expected index: ${err.message}`);
    process.exit(1);
  }

  const actualComparable = { version: actual.version, recipes: actual.recipes };
  const expectedComparable = { version: expected.version, recipes: expected.recipes };

  if (JSON.stringify(actualComparable) !== JSON.stringify(expectedComparable)) {
    console.error('❌ recipes.json is stale or out of sync with recipes/*.yaml.');
    console.error('   Run: npm run index:recipes');
    process.exit(1);
  }

  console.log(`✅ recipes.json is synchronized (${expected.recipes.length} recipes).`);
}

main();
