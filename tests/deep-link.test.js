'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { initApp } = require('./helpers/app');

test('a ?recipe= URL selects the requested recipe', async () => {
  const { app } = await initApp({
    url: 'http://127.0.0.1:4189/index.html?recipe=crispy-mushroom-mac-and-cheese'
  });

  assert.equal(app.selectedId, 'crispy-mushroom-mac-and-cheese');
  assert.equal(app.current.meta.name, 'Crispy Mushroom Mac and Cheese (Weeknight)');
  assert.equal(app.current.ingredients.length, 15);
  assert.equal(app.current.science_notes.length, 10);
  assert.equal(app.current.schema_version, '2.0');
  assert.equal(app.current.provenance.status, 'proposed');
  assert.equal(app.current.equipment.preferred.type, 'cast_iron_skillet');
});

test('an unknown ?recipe= id falls back without crashing', async () => {
  const { app } = await initApp({
    url: 'http://127.0.0.1:4189/index.html?recipe=does-not-exist'
  });

  assert.ok(app.selectedId);
  assert.notEqual(app.selectedId, 'does-not-exist');
  assert.ok(app.current);
});
