'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { ROOT } = require('./helpers/app');

test('all recipes validate against the versioned JSON Schema', () => {
  const output = execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'validate-schema.js')], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  assert.match(output, /Validated \d+ recipe file/);
  assert.match(output, /Errors: 0/);
});
