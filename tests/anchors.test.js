'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { ROOT } = require('./helpers/app');

const dom = new JSDOM(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'));
const document = dom.window.document;

test('every document id is unique', () => {
  const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual(duplicates, []);
});

test('every same-page link resolves to a real fragment target', () => {
  const links = [...document.querySelectorAll('a[href^="#"]')];
  const missing = links
    .map((link) => link.getAttribute('href').slice(1))
    .filter((id) => id && !document.getElementById(id));
  assert.deepEqual(missing, []);
});

test('the shareable recipe sections and home tools have stable anchors', () => {
  ['home-heading', 'recipe-library', 'ingredients', 'steps', 'science', 'nutrition', 'experiments', 'notes', 'bookmarklet', 'import-export', 'display-preferences', 'copyright'].forEach((id) => {
    assert.ok(document.getElementById(id), `missing anchor target #${id}`);
  });
});

test('recipe headings have named permalinks', () => {
  const permalinks = [...document.querySelectorAll('a.permalink')];
  assert.ok(permalinks.length >= 5);
  permalinks.forEach((link) => {
    assert.ok(link.querySelector('.visually-hidden')?.textContent.includes('Permalink'), 'permalink lacks a meaningful accessible name');
    assert.ok(document.getElementById(link.getAttribute('href').slice(1)), 'permalink target is missing');
  });
});

test('the page has a skip link and a focusable main target', () => {
  const skip = document.querySelector('.skip-link');
  assert.ok(skip);
  assert.equal(skip.getAttribute('href'), '#main-content');
  const main = document.querySelector('main#main-content');
  assert.ok(main);
  assert.equal(main.getAttribute('tabindex'), '-1');
});
