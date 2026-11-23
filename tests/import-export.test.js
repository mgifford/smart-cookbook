'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { bootApp } = require('./helpers/app');

const fixture = `schema_version: "2.0"
id: stable-import-fixture
provenance:
  type: adaptation
  status: proposed
equipment:
  preferred:
    type: cast_iron_skillet
    size_inches: 12
desired_outcomes: [crispy_top, mushroom_forward]
testing_status: untested
meta:
  name: Stable Import Fixture
  source: https://example.com/fixture
  base_servings: 4
  prep_time: PT10M
  notes: "Fixture notes must survive."
ingredients:
  - name: mushrooms
    qty_g: 400
    vol_est: "400 g"
    function: flavour
    ww_points: null
    substitutions: []
  - name: butter
    qty_g: 45
    vol_est: "3 tbsp"
    function: fat
    ww_points: null
    substitutions: []
steps:
  - Cook the mushrooms.
science_notes:
  - A science note that must survive.
history:
  - date: "2026-11-23"
    note: Proposed, not tested.
`;

test('YAML import preserves science notes, history, ids, and unknown top-level fields', () => {
  const { app } = bootApp();
  app.yamlText = fixture;
  app.loadYaml();

  assert.equal(app.current.id, 'stable-import-fixture');
  assert.equal(app.current.schema_version, '2.0');
  assert.equal(app.current.provenance.type, 'adaptation');
  assert.equal(app.current.equipment.preferred.type, 'cast_iron_skillet');
  assert.deepEqual(Array.from(app.current.desired_outcomes), ['crispy_top', 'mushroom_forward']);
  assert.equal(app.current.testing_status, 'untested');
  assert.equal(app.current.science_notes.length, 1);
  assert.equal(app.current.history.length, 1);
  assert.equal(app.current.meta.notes, 'Fixture notes must survive.');
});

test('YAML export and reimport preserve the same semantic fields', () => {
  const { app } = bootApp();
  app.yamlText = fixture;
  app.loadYaml();
  app.saveYaml();

  const exported = app.yamlText;
  assert.match(exported, /^schema_version:/m);
  assert.match(exported, /^id: stable-import-fixture$/m);
  assert.match(exported, /^provenance:/m);
  assert.match(exported, /^equipment:/m);
  assert.match(exported, /^desired_outcomes:/m);
  assert.match(exported, /^testing_status: untested$/m);
  assert.match(exported, /^science_notes:/m);
  assert.match(exported, /^history:/m);

  app.yamlText = exported;
  app.loadYaml();

  assert.equal(app.current.id, 'stable-import-fixture');
  assert.equal(app.current.science_notes[0], 'A science note that must survive.');
  assert.equal(app.current.history[0].date instanceof Date ? app.current.history[0].date.toISOString().slice(0, 10) : app.current.history[0].date, '2026-11-23');
  assert.equal(app.current.provenance.status, 'proposed');
  assert.equal(app.current.equipment.preferred.size_inches, 12);
});

test('recipe YAML without an explicit id still gets a stable slug', () => {
  const { app } = bootApp();
  app.yamlText = fixture.replace('id: stable-import-fixture\n', '');
  app.loadYaml();
  assert.equal(app.current.id, 'stable-import-fixture'); // slugified from the fixture name
});

test('an import collision does not overwrite without confirmation', () => {
  const { app, window } = bootApp();
  app.yamlText = fixture;
  app.loadYaml();
  const originalName = app.current.meta.name;

  window.confirm = () => false;
  app.yamlText = fixture.replace('name: Stable Import Fixture', 'name: Replacement Name');
  app.loadYaml();

  assert.equal(app.current.meta.name, originalName);
});
