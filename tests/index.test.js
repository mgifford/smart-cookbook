'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { buildRecipeIndex } = require('../scripts/lib/recipe-index');
const { ROOT } = require('./helpers/app');

test('the generated index contains every YAML recipe with a stable id', () => {
  const index = buildRecipeIndex();
  assert.ok(index.recipes.length >= 11);
  const ids = index.recipes.map((recipe) => recipe.id);
  assert.equal(new Set(ids).size, ids.length);
  const pilot = index.recipes.find((recipe) => recipe.id === 'crispy-mushroom-mac-and-cheese');
  assert.ok(pilot);
  assert.equal(pilot.status, 'Proposed - not yet kitchen-tested');
  assert.equal(pilot.has_science_notes, true);
});

test('check-index confirms recipes.json matches the YAML source', () => {
  const output = execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'check-index.js')], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  assert.match(output, /synchronized/);
});
