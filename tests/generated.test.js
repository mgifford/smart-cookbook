'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { ROOT } = require('./helpers/app');
const conversions = require('../src/generated/conversions');

test('generated conversion data is synchronized and representative values are present', () => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'check-conversions.js')], { cwd: ROOT, encoding: 'utf8' });
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'check-schema-module.js')], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(conversions.densitiesPerCup['all-purpose flour'], 120);
  assert.equal(conversions.densitiesPerCup['mature cheddar cheese'], 113);
  assert.equal(conversions.wholeUnitWeights.egg.default, 57);
  assert.equal(conversions.displayPrefs.salt.gramsPerUnit, 6);
  assert.ok(conversions.volumeFirst.includes('milk'));
});
