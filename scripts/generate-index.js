#!/usr/bin/env node
'use strict';

/**
 * Generate the browser-facing recipe index (recipes.json).
 * Run: node scripts/generate-index.js
 */

const fs = require('fs');
const path = require('path');
const { buildRecipeIndex, DEFAULT_ROOT } = require('./lib/recipe-index');

const OUTPUT_FILE = path.join(DEFAULT_ROOT, 'recipes.json');

function main() {
  console.log('\n📋 Generating recipe index...\n');
  const index = buildRecipeIndex();

  for (const recipe of index.recipes) {
    console.log(`  ✓ ${recipe.name}`);
  }

  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(index, null, 2)}\n`);
  console.log(`\n✅ Generated ${index.recipes.length} recipes`);
  console.log(`📄 Index saved to: ${OUTPUT_FILE}\n`);
}

try {
  main();
} catch (err) {
  console.error(`❌ ${err.message}`);
  process.exit(1);
}
