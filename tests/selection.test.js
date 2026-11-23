'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { initApp } = require('./helpers/app');

test('the root URL stays on the home page even with a stored selection', async () => {
  const { app } = await initApp({
    storage: { 'cookbook-selected-recipe': 'lasagna' }
  });
  assert.equal(app.showHome, true);
  assert.equal(app.selectedId, 'lasagna');
  assert.equal(app.showHome, true);
});

test('an explicit valid ?recipe= URL takes precedence over the stored selection', async () => {
  const { app } = await initApp({
    url: 'http://127.0.0.1:4189/index.html?recipe=crispy-mushroom-mac-and-cheese',
    storage: { 'cookbook-selected-recipe': 'lasagna' }
  });
  assert.equal(app.selectedId, 'crispy-mushroom-mac-and-cheese');
  assert.equal(app.showHome, false);
});

test('a tombstoned stored selection is not revived', async () => {
  const { app } = await initApp({
    storage: {
      'cookbook-selected-recipe': 'lasagna',
      'cookbook-deleted-recipes': JSON.stringify(['lasagna'])
    }
  });
  assert.equal(app.showHome, true);
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

test('the root URL is the shareable home page', async () => {
  const { app, window } = await initApp();
  assert.equal(app.showHome, true);
  assert.equal(window.location.search, '');
});

test('a deep link opens the recipe and keeps its section hash', async () => {
  const { app, window } = await initApp({
    url: 'http://127.0.0.1:4189/index.html?recipe=crispy-mushroom-mac-and-cheese#ingredients'
  });
  assert.equal(app.showHome, false);
  assert.equal(window.location.hash, '#ingredients');
});

test('going home removes the recipe and hash while preserving history', async () => {
  const { app, window } = await initApp({
    url: 'http://127.0.0.1:4189/index.html?recipe=crispy-mushroom-mac-and-cheese#steps'
  });
  const before = window.history.length;
  app.goHome();
  assert.equal(app.showHome, true);
  assert.equal(new URLSearchParams(window.location.search).get('recipe'), null);
  assert.equal(window.location.hash, '');
  assert.ok(window.history.length >= before);
});

test('recipe and share URLs include a stable recipe id and optional section anchor', async () => {
  const { app, window } = await initApp({
    url: 'http://127.0.0.1:4189/index.html?recipe=crispy-mushroom-mac-and-cheese'
  });
  assert.match(app.recipeUrl('lasagna'), /\?recipe=lasagna$/);
  assert.match(app.shareUrlFor('ingredients'), /\?recipe=crispy-mushroom-mac-and-cheese#ingredients$/);
});
