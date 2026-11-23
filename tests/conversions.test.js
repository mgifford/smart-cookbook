'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { bootApp } = require('./helpers/app');

const ingredient = (name, qty_g) => ({
  name, qty_g, vol_est: '', function: 'test', ww_points: null, substitutions: []
});

test('250 g all-purpose flour stays 250 g in metric precision mode', () => {
  const { app } = bootApp();
  app.prefs = { system: 'metric', weightUnit: 'g', volumeUnit: 'ml', tempUnit: 'C' };
  app.precisionMode = true;
  const flour = { ...ingredient('all-purpose flour', 250), displayName: 'all-purpose flour' };
  assert.equal(app.formatQuantity(flour), '250 g');
});

test('250 g all-purpose flour converts to ounces with the correct factor', () => {
  const { app } = bootApp();
  app.prefs = { system: 'imperial', weightUnit: 'oz', volumeUnit: 'cups', tempUnit: 'F' };
  app.precisionMode = true;
  const flour = { ...ingredient('all-purpose flour', 250), displayName: 'all-purpose flour' };
  assert.equal(app.formatQuantity(flour), '8.8 oz');
});

test('cup conversion uses the configured flour density and is approximate', () => {
  const { app } = bootApp();
  app.prefs = { system: 'auto', weightUnit: 'oz', volumeUnit: 'cups', tempUnit: 'F' };
  app.precisionMode = false;
  const flour = { ...ingredient('all-purpose flour', 250), displayName: 'all-purpose flour' };
  assert.equal(app.formatQuantity(flour), '2 cups');
});

test('metric liquids display in millilitres', () => {
  const { app } = bootApp();
  app.prefs = { system: 'auto', weightUnit: 'g', volumeUnit: 'ml', tempUnit: 'C' };
  app.precisionMode = false;
  const milk = { ...ingredient('whole milk', 613), displayName: 'whole milk' };
  assert.equal(app.formatQuantity(milk), '600 ml');
});

test('metric solids display in grams rather than millilitres', () => {
  const { app } = bootApp();
  app.prefs = { system: 'auto', weightUnit: 'g', volumeUnit: 'ml', tempUnit: 'C' };
  app.precisionMode = false;
  const cheese = { ...ingredient('mature cheddar cheese', 250), displayName: 'mature cheddar cheese' };
  assert.equal(app.formatQuantity(cheese), '250 g');
});

test('temperature conversion supports degree symbols and keeps readable spacing', () => {
  const { app } = bootApp();
  app.current = {
    meta: { base_servings: 1, name: 'Temperature fixture' },
    ingredients: [],
    steps: ['Bake at 350 degrees F.', 'Roast at 200°C.', 'Preheat to 175C.'],
    science_notes: []
  };

  app.prefs = { system: 'metric', weightUnit: 'g', volumeUnit: 'ml', tempUnit: 'C' };
  assert.deepEqual(app.stepsList(), [
    'Bake at 177 degrees C.',
    'Roast at 200°C.',
    'Preheat to 175C.'
  ]);

  app.prefs.tempUnit = 'F';
  assert.deepEqual(app.stepsList(), [
    'Bake at 350 degrees F.',
    'Roast at 392°F.',
    'Preheat to 347F.'
  ]);
});

test('unknown density falls back to grams instead of pretending to know volume', () => {
  const { app } = bootApp();
  app.prefs = { system: 'auto', weightUnit: 'oz', volumeUnit: 'cups', tempUnit: 'F' };
  app.precisionMode = false;
  const mystery = { ...ingredient('mystery powder', 100), displayName: 'mystery powder' };
  assert.equal(app.formatQuantity(mystery), '100 g');
});
