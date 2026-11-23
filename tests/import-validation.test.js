'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { bootApp } = require('./helpers/app');

const base = (ingredients, meta = {}) => `schema_version: "2.0"
id: import-fixture
meta:
  name: Import Fixture
  source: https://example.com/fixture
  base_servings: 4
  prep_time: PT10M
ingredients:
${ingredients}
steps:
  - Cook.
science_notes:
  - A science note.
history: []
`;

const butter = (qty, purpose) => `  - name: butter
    qty_g: ${qty}
    vol_est: "${qty} g ${purpose}"
    function: fat
    ww_points: null
    substitutions: []`;

test('repeated ingredient names with different purposes are preserved in order', () => {
  const { app } = bootApp();
  app.yamlText = base(`${butter(40, 'for cheese sauce')}\n${butter(20, 'for bread topping')}`);
  app.loadYaml();

  assert.equal(app.current.ingredients.length, 2);
  assert.deepEqual(Array.from(app.current.ingredients, (i) => i.name), ['butter', 'butter']);
  assert.deepEqual(Array.from(app.current.ingredients, (i) => i.qty_g), [40, 20]);
  assert.deepEqual(Array.from(app.current.ingredients, (i) => i.vol_est), ['40 g for cheese sauce', '20 g for bread topping']);
});

test('unknown quantities stay null and are labelled as unknown', () => {
  const { app } = bootApp();
  app.yamlText = base(`  - name: mushrooms
    qty_g: null
    vol_est: "2 generous handfuls"
    function: flavour
    ww_points: null
    substitutions: []
  - name: water
    qty_g: 100
    vol_est: "100 ml"
    function: moisture
    ww_points: null
    substitutions: []`);
  app.loadYaml();

  assert.equal(app.current.ingredients[0].qty_g, null);
  assert.equal(app.current.ingredients[0].estimated, false);
  assert.equal(app.current.ingredients[0].quantity_source.method, 'unknown');
  assert.match(app.importWarnings.map((w) => w.message).join(' '), /unknown quantities/);
});

test('estimated quantities are numeric but explicitly marked estimated', () => {
  const { app } = bootApp();
  app.yamlText = base(`  - name: all-purpose flour
    vol_est: "2 cups"
    function: structure
    ww_points: null
    substitutions: []
  - name: water
    qty_g: 100
    vol_est: "100 ml"
    function: moisture
    ww_points: null
    substitutions: []`);
  app.loadYaml();

  assert.equal(app.current.ingredients[0].qty_g, 240);
  assert.equal(app.current.ingredients[0].estimated, true);
  assert.equal(app.current.ingredients[0].quantity_source.method, 'estimated_from_description');
});

test('null and explicit zero WW values are preserved distinctly', () => {
  const { app } = bootApp();
  app.yamlText = base(`  - name: salt
    qty_g: 4
    vol_est: "2/3 tsp"
    function: seasoning
    ww_points: null
    substitutions: []
  - name: water
    qty_g: 100
    vol_est: "100 ml"
    function: moisture
    ww_points: 0
    substitutions: []`);
  app.loadYaml();

  assert.equal(app.current.ingredients[0].ww_points, null);
  assert.equal(app.current.ingredients[1].ww_points, 0);
});

test('invalid imports are rejected and the pasted text is preserved', () => {
  const { app } = bootApp();
  const invalid = base(`  - name: butter
    qty_g: 40
    vol_est: "40 g"
    function: fat
    ww_points: null
    substitutions: []`).replace('base_servings: 4', 'base_servings: 0');
  const beforeCount = app.recipes.length;
  app.yamlText = invalid;
  app.loadYaml();

  assert.ok(app.importErrors.length > 0);
  assert.equal(app.yamlText, invalid);
  assert.equal(app.recipes.length, beforeCount);
  assert.ok(app.importErrors.some((e) => e.path.includes('base_servings')));
});

test('an unsupported schema version is rejected', () => {
  const { app } = bootApp();
  app.yamlText = base(`  - name: butter
    qty_g: 40
    vol_est: "40 g"
    function: fat
    ww_points: null
    substitutions: []`).replace('schema_version: "2.0"', 'schema_version: "9.0"');
  app.loadYaml();

  assert.ok(app.importErrors.some((e) => e.keyword === 'schemaVersion'));
});

test('an explicit zero quantity remains zero and is not estimated', () => {
  const { app } = bootApp();
  app.yamlText = base(`  - name: salt
    qty_g: 0
    vol_est: "to taste"
    function: seasoning
    ww_points: null
    substitutions: []
  - name: water
    qty_g: 100
    vol_est: "100 ml"
    function: moisture
    ww_points: null
    substitutions: []`);
  app.loadYaml();

  assert.equal(app.current.ingredients[0].qty_g, 0);
  assert.equal(app.current.ingredients[0].estimated, false);
  assert.equal(app.current.ingredients[0].quantity_source.method, 'explicit');
});

test('an invalid explicit id is rejected instead of silently replaced', () => {
  const { app } = bootApp();
  const before = app.recipes.length;
  app.yamlText = base(`  - name: butter
    qty_g: 40
    vol_est: "40 g"
    function: fat
    ww_points: null
    substitutions: []`).replace('id: import-fixture', 'id: Bad ID');
  app.loadYaml();
  assert.equal(app.recipes.length, before);
  assert.ok(app.importErrors.some((error) => error.path === 'id'));
});

test('a non-numeric quantity is rejected instead of treated as unknown', () => {
  const { app } = bootApp();
  const before = app.recipes.length;
  app.yamlText = base(`  - name: butter
    qty_g: "a lot"
    vol_est: "a lot"
    function: fat
    ww_points: null
    substitutions: []
  - name: water
    qty_g: 100
    vol_est: "100 ml"
    function: moisture
    ww_points: null
    substitutions: []`);
  app.loadYaml();
  assert.equal(app.recipes.length, before);
  assert.ok(app.importErrors.length > 0);
  assert.match(app.importErrors.map((error) => error.message).join(' '), /qty_g/);
});
