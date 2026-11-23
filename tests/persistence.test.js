'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { initApp, wait, createFetchStub } = require('./helpers/app');

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

test('a partial backup reports expected, exported, and missing recipes', async () => {
  const baseStub = createFetchStub();
  const fetchStub = async (url) => {
    if (String(url).includes('recipes/lasagna.yaml')) {
      return { ok: false, status: 500, text: async () => '', json: async () => ({}) };
    }
    return baseStub(url);
  };
  const { app } = await initApp({ fetchStub });
  const result = await app.collectFullRecipes();

  assert.equal(result.expected, app.recipes.length);
  assert.equal(result.recipes.length, result.expected - 1);
  assert.deepEqual(Array.from(result.failed), ['lasagna']);
});

test('a cancelled partial export creates no result', async () => {
  const baseStub = createFetchStub();
  const fetchStub = async (url) => {
    if (String(url).includes('recipes/lasagna.yaml')) {
      return { ok: false, status: 500, text: async () => '', json: async () => ({}) };
    }
    return baseStub(url);
  };
  const { app, window } = await initApp({ fetchStub });
  window.confirm = () => false;
  const result = await app.prepareExport();
  assert.equal(result, null);
});

test('the export manifest identifies a partial backup', async () => {
  const baseStub = createFetchStub();
  const fetchStub = async (url) => {
    if (String(url).includes('recipes/lasagna.yaml')) {
      return { ok: false, status: 500, text: async () => '', json: async () => ({}) };
    }
    return baseStub(url);
  };
  const { app } = await initApp({ fetchStub });
  const result = await app.collectFullRecipes();
  const manifest = app.buildExportManifest(result);
  assert.equal(manifest.export_type, 'partial');
  assert.equal(manifest.expected_recipes, result.expected);
  assert.deepEqual(Array.from(manifest.missing_recipe_ids), ['lasagna']);
});

test('a complete export manifest says complete and includes every recipe', async () => {
  const { app } = await initApp();
  const result = await app.collectFullRecipes();
  const manifest = app.buildExportManifest(result);
  assert.equal(result.failed.length, 0);
  assert.equal(manifest.export_type, 'complete');
  assert.equal(manifest.expected_recipes, manifest.exported_recipes);
  assert.deepEqual(Array.from(manifest.missing_recipe_ids), []);
});
