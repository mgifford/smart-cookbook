'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const DEFAULT_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Build the browser-facing recipe index from the authoritative YAML files.
 * The generated output has no timestamp, so the index is deterministic.
 */
function buildRecipeIndex(root = DEFAULT_ROOT) {
  const recipesDir = path.join(root, 'recipes');
  const files = fs.readdirSync(recipesDir)
    .filter((name) => name.endsWith('.yaml') || name.endsWith('.yml'))
    .sort();

  const recipes = [];
  const seenIds = new Map();

  for (const filename of files) {
    const recipe = yaml.load(fs.readFileSync(path.join(recipesDir, filename), 'utf8')) || {};
    const recipeId = recipe.id || path.basename(filename).replace(/\.ya?ml$/, '');
    const meta = recipe.meta || {};

    if (seenIds.has(recipeId)) {
      throw new Error(`Duplicate recipe id "${recipeId}" in ${filename} and ${seenIds.get(recipeId)}`);
    }
    seenIds.set(recipeId, filename);

    recipes.push({
      id: recipeId,
      name: meta.name || 'Unnamed Recipe',
      source: meta.source || '',
      servings: meta.base_servings || 1,
      prep_time: meta.prep_time || '',
      cook_time: meta.cook_time || '',
      status: meta.status || undefined,
      ingredients_count: (recipe.ingredients || []).length,
      steps_count: (recipe.steps || []).length,
      has_science_notes: Array.isArray(recipe.science_notes) && recipe.science_notes.length > 0
    });
  }

  recipes.sort((a, b) => a.name.localeCompare(b.name));
  // No timestamp: generated output is deterministic and produces reviewable diffs.
  return { version: '1.0', recipes };
}

module.exports = { buildRecipeIndex, DEFAULT_ROOT };
