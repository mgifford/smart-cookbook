'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { initApp } = require('./helpers/app');

test('a stored selection is restored when there is no explicit URL recipe', async () => {
  const { app } = await initApp({
    storage: { 'cookbook-selected-recipe': 'lasagna' }
  });
  assert.equal(app.selectedId, 'lasagna');
  assert.equal(app.current.meta.name, 'The Best Homemade Lasagna');
});

test('an explicit valid ?recipe= URL takes precedence over the stored selection', async () => {
  const { app } = await initApp({
    url: 'http://127.0.0.1:4189/index.html?recipe=crispy-mushroom-mac-and-cheese',
    storage: { 'cookbook-selected-recipe': 'lasagna' }
  });
  assert.equal(app.selectedId, 'crispy-mushroom-mac-and-cheese');
});

test('a tombstoned stored selection is not revived', async () => {
  const { app } = await initApp({
    storage: {
      'cookbook-selected-recipe': 'lasagna',
      'cookbook-deleted-recipes': JSON.stringify(['lasagna'])
    }
  });
  assert.notEqual(app.selectedId, 'lasagna');
  assert.ok(app.selectedId);
});

test('an invalid explicit URL falls back to a valid stored selection', async () => {
  const { app } = await initApp({
    url: 'http://127.0.0.1:4189/index.html?recipe=does-not-exist',
    storage: { 'cookbook-selected-recipe': 'lasagna' }
  });
  assert.equal(app.selectedId, 'lasagna');
});

test('loading a recipe updates the browser URL without a routing framework', async () => {
  const { app, window } = await initApp();
  await app.loadRecipe('lasagna');
  assert.equal(new URLSearchParams(window.location.search).get('recipe'), 'lasagna');
  assert.equal(window.localStorage.getItem('cookbook-selected-recipe'), 'lasagna');
});
