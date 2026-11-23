#!/usr/bin/env node
'use strict';

/**
 * Validate every recipe against the versioned JSON Schema and check stable IDs.
 * Run: node scripts/validate-schema.js
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const Ajv2020 = require('ajv/dist/2020');

const ROOT = path.resolve(__dirname, '..');
const RECIPES_DIR = path.join(ROOT, 'recipes');
const SCHEMA_PATH = path.join(ROOT, 'schemas', 'recipe.schema.json');

const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: false, allowUnionTypes: true });
const validate = ajv.compile(schema);

let errors = 0;
let warnings = 0;

const reportError = (file, field, message) => {
  errors += 1;
  console.error(`  ❌ ${file} → ${field}: ${message}`);
};

const reportWarning = (file, field, message) => {
  warnings += 1;
  if (process.env.VERBOSE_SCHEMA === '1') {
    console.warn(`  ⚠️  ${file} → ${field}: ${message}`);
  }
};

const formatPath = (instancePath) => instancePath ? instancePath.slice(1).replace(/\//g, '.') : '(root)';

const files = fs.readdirSync(RECIPES_DIR)
  .filter((name) => name.endsWith('.yaml') || name.endsWith('.yml'))
  .sort();

const seenIds = new Map();

for (const filename of files) {
  const filepath = path.join(RECIPES_DIR, filename);
  const file = `recipes/${filename}`;
  let recipe;

  try {
    recipe = yaml.load(fs.readFileSync(filepath, 'utf8'));
  } catch (err) {
    reportError(file, 'YAML', err.message);
    continue;
  }

  if (!recipe || typeof recipe !== 'object' || Array.isArray(recipe)) {
    reportError(file, '(root)', 'Recipe must be a YAML mapping');
    continue;
  }

  if (!validate(recipe)) {
    for (const err of validate.errors) {
      reportError(file, formatPath(err.instancePath), err.message);
    }
  }

  const expectedId = path.basename(filename).replace(/\.ya?ml$/, '');
  const id = recipe.id || expectedId;

  if (recipe.id && recipe.id !== expectedId) {
    reportError(file, 'id', `Stable id "${recipe.id}" must match filename "${expectedId}"`);
  }

  if (!recipe.id) {
    reportWarning(file, 'id', `Legacy recipe without an explicit id; using "${expectedId}"`);
  }

  if (!recipe.schema_version) {
    reportWarning(file, 'schema_version', 'Legacy recipe without schema_version');
  }

  if (seenIds.has(id)) {
    reportError(file, 'id', `Duplicate recipe id "${id}" also used by ${seenIds.get(id)}`);
  } else {
    seenIds.set(id, file);
  }
}

console.log(`\nValidated ${files.length} recipe file(s) against schemas/recipe.schema.json`);
console.log(`Errors: ${errors}; warnings: ${warnings}`);
if (warnings > 0) {
  console.log('Warnings are legacy migrations (missing schema_version/id); run with VERBOSE_SCHEMA=1 for details.');
}
console.log('');

if (errors > 0) {
  process.exit(1);
}
