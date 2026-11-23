#!/usr/bin/env node
'use strict';

/**
 * Generate a browser/Node importable copy of the canonical JSON Schema.
 * Run: node scripts/generate-schema-module.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA_FILE = path.join(ROOT, 'schemas', 'recipe.schema.json');
const OUTPUT_FILE = path.join(ROOT, 'src', 'generated', 'recipe-schema.js');

function buildModule() {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_FILE, 'utf8'));
  const json = JSON.stringify(schema, null, 2);
  return `/* Generated from schemas/recipe.schema.json. Do not edit by hand. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SMART_COOKBOOK_RECIPE_SCHEMA = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  return ${json};
});
`;
}

function main() {
  const output = buildModule();
  fs.writeFileSync(OUTPUT_FILE, output);
  console.log(`Generated ${path.relative(ROOT, OUTPUT_FILE)}`);
}

if (require.main === module) main();
module.exports = { buildModule, OUTPUT_FILE, SCHEMA_FILE };
