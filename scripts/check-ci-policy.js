#!/usr/bin/env node
'use strict';

/**
 * Guard the quality gate against accidentally swallowing failures.
 * This is intentionally a separate check so removing a test from the
 * quality chain does not silently turn the gate into a no-op.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const errors = [];
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

const pkg = JSON.parse(read('package.json'));
const quality = pkg.scripts && pkg.scripts.quality ? pkg.scripts.quality : '';
['check:ci-policy', 'test:unit', 'test:a11y', 'lint:html', 'scan:security'].forEach((command) => {
  if (!quality.includes(command)) errors.push(`quality script does not include ${command}`);
});

const qualityWorkflow = read('.github/workflows/quality.yml');
if (!qualityWorkflow.includes('npm run quality')) errors.push('quality workflow does not run npm run quality');
if (!qualityWorkflow.includes('node scripts/check-ci-policy.js')) errors.push('quality workflow does not run the CI policy check');

const workflows = ['.github/workflows/quality.yml', '.github/workflows/validate.yml'];
workflows.forEach((workflow) => {
  const text = read(workflow);
  if (/continue-on-error\s*:\s*true/i.test(text)) errors.push(`${workflow} allows continue-on-error`);
  if (/\|\|\s*true\b/.test(text)) errors.push(`${workflow} swallows a command failure with || true`);
  if (/--passWithNoTests/.test(text)) errors.push(`${workflow} permits a no-tests pass`);
});

const a11y = read('scripts/ci-a11y.js');
if (!/runtimeErrors\.length/.test(a11y) || !/Runtime errors during journeys/.test(a11y)) {
  errors.push('ci-a11y no longer fails on runtime page/console errors');
}
if (!/violations\.length/.test(a11y) || !/process\.exitCode = 1/.test(a11y)) {
  errors.push('ci-a11y no longer fails on axe violations');
}
if (/disableRules\([^)]*color-contrast/.test(a11y)) {
  errors.push('ci-a11y disables the colour-contrast rule');
}

const testFiles = fs.readdirSync(path.join(ROOT, 'tests')).filter((file) => file.endsWith('.test.js'));
if (testFiles.length === 0) errors.push('no node:test fixtures were found');

if (errors.length) {
  console.error('❌ CI policy check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('✅ CI policy check passed: required tests run and failures cannot be swallowed.');
