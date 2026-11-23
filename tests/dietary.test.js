'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { initApp } = require('./helpers/app');

test('dietary modes distinguish vegetarian from vegan substitutions', async () => {
  const { app } = await initApp();
  const ingredient = {
    name: 'butter',
    substitutions: [
      { name: 'vegetarian butter blend', tags: ['vegetarian'], science_note: 'May contain dairy.' },
      { name: 'olive oil', tags: ['vegan', 'vegetarian'], science_note: 'Plant oil.' }
    ]
  };

  app.dietMode = 'none';
  assert.equal(app.findDietSub(ingredient), null);

  app.dietMode = 'vegetarian';
  assert.equal(app.findDietSub(ingredient).name, 'vegetarian butter blend');

  app.dietMode = 'vegan';
  assert.equal(app.findDietSub(ingredient).name, 'olive oil');
});

test('vegan mode does not fall back to a dairy-only suggestion', async () => {
  const { app } = await initApp();
  const ingredient = {
    name: 'milk',
    substitutions: [{ name: '2% milk', tags: ['vegetarian'], science_note: 'Still dairy.' }]
  };
  app.dietMode = 'vegan';
  assert.equal(app.findDietSub(ingredient), null);
});

test('the meat substitution fallback is available for vegan mode', async () => {
  const { app } = await initApp();
  const ingredient = { name: 'chicken breast', substitutions: [] };
  app.dietMode = 'vegan';
  const substitute = app.findDietSub(ingredient);
  assert.ok(substitute);
  assert.ok((substitute.tags || []).includes('vegan'));
});

test('diet definitions explicitly separate vegetarian and vegan', async () => {
  const { app } = await initApp();
  app.dietMode = 'vegetarian';
  assert.match(app.dietDefinition(), /Dairy and eggs may remain/);
  app.dietMode = 'vegan';
  assert.match(app.dietDefinition(), /no animal-derived ingredients/);
  assert.match(app.dietDefinition(), /not automatically vegan/);
});
