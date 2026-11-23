'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { initApp, wait } = require('./helpers/app');

test('deleting a library recipe persists across a re-bootstrap', async () => {
  const { app, window } = await initApp();
  app.selectedId = 'lasagna';
  await app.loadRecipe('lasagna');
  assert.ok(app.recipes.some((recipe) => recipe.id === 'lasagna'));

  app.deleteCurrentRecipe();
  await wait(40);
  assert.ok(!app.recipes.some((recipe) => recipe.id === 'lasagna'));
  assert.ok(JSON.parse(window.localStorage.getItem('cookbook-deleted-recipes') || '[]').includes('lasagna'));

  await app.bootstrapRecipes();
  assert.ok(!app.recipes.some((recipe) => recipe.id === 'lasagna'), 'deleted recipe must not be restored');
});

test('an explicit re-import revives a deleted library id', async () => {
  const { app } = await initApp();
  app.selectedId = 'lasagna';
  await app.loadRecipe('lasagna');
  app.deleteCurrentRecipe();
  await wait(40);

  app.upsertRecipe({
    id: 'lasagna',
    meta: { name: 'Restored Lasagna', source: '', base_servings: 4, prep_time: 'PT10M' },
    ingredients: [],
    steps: [],
    science_notes: [],
    history: []
  });

  assert.ok(app.recipes.some((recipe) => recipe.id === 'lasagna'));
});

test('collectFullRecipes fetches placeholders instead of exporting empty YAML', async () => {
  const { app } = await initApp();
  assert.ok(app.recipes.some((recipe) => recipe._placeholder));

  const { recipes, failed } = await app.collectFullRecipes();
  assert.equal(failed.length, 0);
  assert.ok(recipes.length >= 11);
  assert.ok(recipes.every((recipe) => Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0));
});
