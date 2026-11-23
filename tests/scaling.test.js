'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { bootApp } = require('./helpers/app');

const ingredient = (name, qty_g, vol_est = '') => ({
  name, qty_g, vol_est, function: 'test', ww_points: null, substitutions: []
});

test('scales 400 g mushrooms from 4 to 6 servings', () => {
  const { app } = bootApp();
  app.current = {
    meta: { base_servings: 4, name: 'Scaling fixture' },
    ingredients: [ingredient('mushrooms', 400, '400 g')],
    steps: ['Cook.'],
    science_notes: ['Fixture.']
  };
  app.servings = 6;

  assert.equal(app.scaledQty(400), 600);
});

test('caps the servings control at 64', () => {
  const { app } = bootApp();
  app.servings = 200;
  app.adjustServings();
  assert.equal(app.servings, 64);

  app.servings = 0;
  app.adjustServings();
  assert.equal(app.servings, 1);
});

test('fractional scaling is rounded only at display time', () => {
  const { app } = bootApp();
  app.current = {
    meta: { base_servings: 3, name: 'Fraction fixture' },
    ingredients: [ingredient('mushrooms', 400)],
    steps: [],
    science_notes: []
  };
  app.servings = 1;
  app.prefs = { system: 'metric', weightUnit: 'g', volumeUnit: 'ml', tempUnit: 'C' };
  app.precisionMode = true;

  const scaled = app.scaledQty(400);
  assert.equal(Math.round(scaled * 100) / 100, 133.33);
  assert.equal(app.formatQuantity({ ...ingredient('mushrooms', scaled), displayName: 'mushrooms' }), '133 g');
});

test('precision mode renders grams for a scaled solid ingredient', () => {
  const { app } = bootApp();
  app.current = {
    meta: { base_servings: 4, name: 'Scaling display fixture' },
    ingredients: [ingredient('brown cremini mushrooms', 400)],
    steps: [],
    science_notes: []
  };
  app.servings = 6;
  app.prefs = { system: 'metric', weightUnit: 'g', volumeUnit: 'ml', tempUnit: 'C' };
  app.precisionMode = true;

  const qty = app.scaledQty(400);
  assert.equal(app.formatQuantity({ ...ingredient('brown cremini mushrooms', qty), displayName: 'brown cremini mushrooms' }), '600 g');
});
