'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { initApp } = require('./helpers/app');

test('the home library excludes the in-memory demo recipe', async () => {
  const { app } = await initApp();
  const ids = app.libraryRecipes().map((recipe) => recipe.id);
  assert.equal(ids.includes('banana-bread'), false);
  assert.ok(ids.includes('crispy-mushroom-mac-and-cheese'));
  assert.ok(ids.length >= 11);
});

test('home cards use a compact source label', async () => {
  const { app } = await initApp();
  assert.equal(app.sourceLabel('https://www.example.com/a/very/long/path'), 'example.com');
  assert.equal(app.sourceLabel('Based on a printed recipe'), 'Based on a printed recipe');
});

test('shared recipe URLs strip unrelated query parameters but keep the section', async () => {
  const { app } = await initApp({
    url: 'http://127.0.0.1:4189/index.html?recipe=crispy-mushroom-mac-and-cheese&debug=true#steps'
  });
  const shared = app.shareUrlFor('ingredients');
  assert.match(shared, /\?recipe=crispy-mushroom-mac-and-cheese#ingredients$/);
  assert.equal(shared.includes('debug=true'), false);
});
