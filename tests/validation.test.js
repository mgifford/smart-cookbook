'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const RecipeValidation = require('../src/recipes/validation');
const schema = require('../src/generated/recipe-schema');

const valid = () => ({
  schema_version: '2.0',
  id: 'fixture',
  meta: { name: 'Fixture', source: 'https://example.com', base_servings: 4, prep_time: 'PT10M' },
  ingredients: [
    { name: 'butter', qty_g: 40, vol_est: '40 g', function: 'fat', ww_points: null, substitutions: [] },
    { name: 'butter', qty_g: 20, vol_est: '20 g', function: 'fat', ww_points: 0, substitutions: [] }
  ],
  steps: ['Cook.'],
  science_notes: ['Note.'],
  history: [],
  extra_metadata: { preserved: true }
});

test('shared validator accepts a valid recipe, duplicate ingredient names, and extra metadata', () => {
  const result = RecipeValidation.validateRecipe(valid(), { schema });
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test('shared validator accepts a null quantity as unknown', () => {
  const recipe = valid();
  recipe.ingredients[0].qty_g = null;
  recipe.ingredients[0].quantity_source = { original: 'a handful', method: 'unknown', reviewed: false };
  const result = RecipeValidation.validateRecipe(recipe, { schema });
  assert.equal(result.valid, true);
});

test('shared validator rejects invalid servings and reports the field', () => {
  const recipe = valid();
  recipe.meta.base_servings = 0;
  const result = RecipeValidation.validateRecipe(recipe, { schema });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.path === 'meta.base_servings'));
});

test('shared validator rejects an unsupported schema version', () => {
  const recipe = valid();
  recipe.schema_version = '9.0';
  const result = RecipeValidation.validateRecipe(recipe, { schema });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.keyword === 'schemaVersion'));
});

test('shared validator rejects an estimated quantity without a number', () => {
  const recipe = valid();
  recipe.ingredients[0].qty_g = null;
  recipe.ingredients[0].estimated = true;
  const result = RecipeValidation.validateRecipe(recipe, { schema });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.keyword === 'estimatedQuantity'));
});

test('legacy recipes are valid but warn about missing id and schema_version', () => {
  const recipe = valid();
  delete recipe.id;
  delete recipe.schema_version;
  const result = RecipeValidation.validateRecipe(recipe, { schema, legacyWarnings: true });
  assert.equal(result.valid, true);
  assert.ok(result.warnings.some((warning) => warning.keyword === 'legacyId'));
  assert.ok(result.warnings.some((warning) => warning.keyword === 'legacyVersion'));
});
