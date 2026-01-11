#!/usr/bin/env node

/**
 * Validate recipe YAML files against the Science Cookbook schema
 * Run: node scripts/validate-recipes.js
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const RECIPES_DIR = path.join(__dirname, '..', 'recipes');
const REQUIRED_FIELDS = ['meta', 'ingredients', 'steps', 'science_notes', 'history'];
const REQUIRED_META_FIELDS = ['name', 'source', 'base_servings', 'prep_time'];
const REQUIRED_INGREDIENT_FIELDS = ['name', 'qty_g', 'vol_est', 'function', 'ww_points', 'substitutions'];

let totalErrors = 0;
let totalWarnings = 0;
let validRecipes = 0;

function error(filename, field, message) {
  totalErrors++;
  console.error(`  ❌ ${filename} → ${field}: ${message}`);
}

function warning(filename, field, message) {
  totalWarnings++;
  console.warn(`  ⚠️  ${filename} → ${field}: ${message}`);
}

function validateRecipe(filename, recipe) {
  let fileErrors = 0;

  // Check required top-level fields
  for (const field of REQUIRED_FIELDS) {
    if (!(field in recipe)) {
      error(filename, field, `Missing required field`);
      fileErrors++;
    }
  }

  // Validate meta
  if (recipe.meta) {
    for (const field of REQUIRED_META_FIELDS) {
      if (!(field in recipe.meta)) {
        error(filename, `meta.${field}`, `Missing required field`);
        fileErrors++;
      }
    }

    // Check base_servings is a valid number
    if (typeof recipe.meta.base_servings !== 'number' || recipe.meta.base_servings <= 0) {
      error(filename, 'meta.base_servings', `Must be a positive number, got: ${recipe.meta.base_servings}`);
      fileErrors++;
    }
  }

  // Validate ingredients
  if (Array.isArray(recipe.ingredients)) {
    const ingredientNames = new Set();

    recipe.ingredients.forEach((ing, idx) => {
      const ingId = `ingredients[${idx}]`;

      // Check required fields
      for (const field of REQUIRED_INGREDIENT_FIELDS) {
        if (!(field in ing)) {
          error(filename, `${ingId}.${field}`, `Missing required field`);
          fileErrors++;
        }
      }

      // Check qty_g is numeric and positive
      if (typeof ing.qty_g !== 'number' || ing.qty_g < 0) {
        error(filename, `${ingId}.qty_g`, `Must be a non-negative number, got: ${ing.qty_g}`);
        fileErrors++;
      }

      // Check for duplicate ingredient names
      const cleanName = (ing.name || '').toLowerCase().trim();
      if (cleanName) {
        if (ingredientNames.has(cleanName)) {
          warning(filename, `${ingId}.name`, `Duplicate ingredient: "${ing.name}"`);
        }
        ingredientNames.add(cleanName);
      }

      // Validate substitutions if present
      if (Array.isArray(ing.substitutions)) {
        ing.substitutions.forEach((sub, subIdx) => {
          const subId = `${ingId}.substitutions[${subIdx}]`;

          if (!sub.name) {
            error(filename, `${subId}.name`, `Missing name`);
            fileErrors++;
          }
          if (typeof sub.ratio !== 'number' || sub.ratio <= 0) {
            error(filename, `${subId}.ratio`, `Must be a positive number, got: ${sub.ratio}`);
            fileErrors++;
          }
          if (!sub.science_note) {
            warning(filename, `${subId}.science_note`, `Missing science explanation`);
          }
        });
      }
    });

    // Check minimum ingredient count
    if (recipe.ingredients.length < 2) {
      warning(filename, 'ingredients', `Recipe has fewer than 2 ingredients (${recipe.ingredients.length})`);
    }
  } else {
    error(filename, 'ingredients', `Must be an array, got: ${typeof recipe.ingredients}`);
    fileErrors++;
  }

  // Validate steps
  if (Array.isArray(recipe.steps)) {
    if (recipe.steps.length === 0) {
      error(filename, 'steps', `Must have at least one step`);
      fileErrors++;
    }

    recipe.steps.forEach((step, idx) => {
      if (typeof step !== 'string' || step.trim().length === 0) {
        error(filename, `steps[${idx}]`, `Step must be a non-empty string`);
        fileErrors++;
      }
    });
  } else {
    error(filename, 'steps', `Must be an array, got: ${typeof recipe.steps}`);
    fileErrors++;
  }

  // Validate science_notes
  if (Array.isArray(recipe.science_notes)) {
    if (recipe.science_notes.length === 0) {
      warning(filename, 'science_notes', `No science notes provided`);
    }

    recipe.science_notes.forEach((note, idx) => {
      if (typeof note !== 'string' || note.trim().length === 0) {
        error(filename, `science_notes[${idx}]`, `Note must be a non-empty string`);
        fileErrors++;
      }
    });
  } else {
    error(filename, 'science_notes', `Must be an array, got: ${typeof recipe.science_notes}`);
    fileErrors++;
  }

  // Validate history
  if (!Array.isArray(recipe.history)) {
    warning(filename, 'history', `Should be an array for tracking changes`);
  }

  return fileErrors === 0;
}

async function main() {
  console.log('\n🔍 Validating recipes in /recipes/...\n');

  if (!fs.existsSync(RECIPES_DIR)) {
    console.error(`❌ Recipes directory not found: ${RECIPES_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(RECIPES_DIR).filter(f => f.endsWith('.yaml'));

  if (files.length === 0) {
    console.warn('⚠️  No YAML files found in /recipes/');
    process.exit(0);
  }

  for (const filename of files) {
    const filepath = path.join(RECIPES_DIR, filename);
    try {
      const content = fs.readFileSync(filepath, 'utf8');
      const recipe = yaml.load(content);

      if (validateRecipe(filename, recipe)) {
        console.log(`  ✅ ${filename}`);
        validRecipes++;
      }
    } catch (err) {
      error(filename, 'YAML parse error', err.message);
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Validation Report`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Valid recipes:    ${validRecipes}/${files.length}`);
  console.log(`  Total errors:     ${totalErrors}`);
  console.log(`  Total warnings:   ${totalWarnings}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  if (totalErrors > 0) {
    console.log(`❌ Validation FAILED - ${totalErrors} error(s) found\n`);
    process.exit(1);
  }

  if (totalWarnings > 0) {
    console.log(`⚠️  Validation passed with ${totalWarnings} warning(s)\n`);
  } else {
    console.log(`✅ All recipes passed validation!\n`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
