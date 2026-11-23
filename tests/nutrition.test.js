'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { initApp } = require('./helpers/app');

test('nutrition reports partial coverage and does not treat an unknown ingredient as zero', async () => {
  const { app } = await initApp();
  app.current = {
    meta: { base_servings: 1, name: 'Nutrition fixture' },
    ingredients: [
      { name: 'butter', qty_g: 100, vol_est: '100 g', function: 'fat', ww_points: null, substitutions: [] },
      { name: 'mystery ingredient', qty_g: 50, vol_est: '50 g', function: 'test', ww_points: null, substitutions: [] }
    ],
    steps: [],
    science_notes: []
  };
  app.servings = 1;

  const summary = app.nutritionSummary();
  assert.equal(summary.coverage.covered, 1);
  assert.equal(summary.coverage.total, 2);
  assert.deepEqual(Array.from(summary.coverage.missing), ['mystery ingredient']);
  assert.equal(summary.total.calories, 717); // butter only, not zeroed for the unknown ingredient

  const text = app.nutritionCoverageText();
  assert.match(text, /1 of 2/);
  assert.match(text, /mystery ingredient/);
  assert.match(text, /not lab measurements/i);
});

test('a missing quantity is reported separately from missing reference data', async () => {
  const { app } = await initApp();
  app.current = {
    meta: { base_servings: 1, name: 'Quantity coverage fixture' },
    ingredients: [
      { name: 'butter', qty_g: 100, vol_est: '100 g', function: 'fat', ww_points: null, substitutions: [] },
      { name: 'mushrooms', qty_g: null, vol_est: '2 handfuls', function: 'flavour', ww_points: null, substitutions: [] },
      { name: 'mystery ingredient', qty_g: 50, vol_est: '50 g', function: 'test', ww_points: null, substitutions: [] }
    ],
    steps: [],
    science_notes: []
  };
  app.servings = 1;

  const summary = app.nutritionSummary();
  assert.deepEqual(Array.from(summary.coverage.missingQuantities), ['mushrooms']);
  assert.deepEqual(Array.from(summary.coverage.missingReferences), ['mystery ingredient']);
  assert.match(app.nutritionCoverageLabel(), /Known-ingredient subtotal/);
  assert.match(app.nutritionCoverageText(), /lack a usable quantity/);
  assert.match(app.nutritionCoverageText(), /lack reference data/);
});

test('repeated legitimate ingredients are both counted in nutrition', async () => {
  const { app } = await initApp();
  app.current = {
    meta: { base_servings: 1, name: 'Repeated butter fixture' },
    ingredients: [
      { name: 'butter', qty_g: 40, vol_est: '40 g', function: 'fat', ww_points: null, substitutions: [] },
      { name: 'butter', qty_g: 20, vol_est: '20 g', function: 'fat', ww_points: null, substitutions: [] }
    ],
    steps: [],
    science_notes: []
  };
  app.servings = 1;
  const summary = app.nutritionSummary();
  assert.equal(summary.coverage.covered, 2);
  assert.equal(summary.total.calories, Math.round(717 * 0.6)); // 60 g butter total
});

test('nutrition display is rounded to a defensible approximate precision', async () => {
  const { app } = await initApp();
  assert.equal(app.formatNutrition(172.8, 'g'), '≈ 170 g');
  assert.equal(app.formatNutrition(34.6, 'g'), '≈ 35 g');
  assert.equal(app.formatNutrition(19.2, 'g'), '≈ 20 g');
  assert.equal(app.formatNutrition(3.8, 'g'), '≈ 4 g');
  assert.equal(app.formatNutrition(729, 'kcal'), '≈ 730 kcal');
});
