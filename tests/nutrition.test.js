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
