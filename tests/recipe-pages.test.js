'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { ROOT } = require('./helpers/app');
const { buildPages, renderRecipePage } = require('../scripts/generate-recipe-pages');

const pages = buildPages();

test('every recipe has a generated static page', () => {
  assert.equal(pages.length, 11);
  assert.equal(new Set(pages.map((page) => page.id)).size, 11);
  pages.forEach((page) => assert.ok(fs.existsSync(page.file), `missing ${page.file}`));
});

test('a focused recipe page has ingredients, directions, and no app/bookmarklet shell', () => {
  const page = pages.find((item) => item.id === 'crispy-mushroom-mac-and-cheese');
  const dom = new JSDOM(page.html);
  const document = dom.window.document;
  assert.equal(document.querySelector('h1').textContent, 'Crispy Mushroom Mac and Cheese (Weeknight)');
  assert.ok(document.querySelectorAll('#ingredients li').length >= 15);
  assert.ok(document.querySelectorAll('#steps li').length >= 13);
  assert.ok(document.querySelector('#dietary').textContent.includes('Vegetarian'));
  assert.ok(document.querySelector('#dietary').textContent.includes('Vegan'));
  assert.equal(document.querySelectorAll('script').length, 0);
  assert.equal(document.querySelector('[x-data]'), null);
  assert.equal(document.body.textContent.toLowerCase().includes('bookmarklet'), false);
  assert.equal(document.querySelector('#main-content').getAttribute('tabindex'), '-1');
});

test('all in-page recipe links resolve and the page has a skip link', () => {
  pages.forEach((page) => {
    const dom = new JSDOM(page.html);
    const document = dom.window.document;
    [...document.querySelectorAll('a[href^="#"]')].forEach((link) => {
      const id = link.getAttribute('href').slice(1);
      assert.ok(document.getElementById(id), `${page.id} links to missing #${id}`);
    });
    assert.equal(document.querySelector('.skip-link').getAttribute('href'), '#main-content');
  });
});

test('recipe page text is escaped rather than injected', () => {
  const html = renderRecipePage({
    id: 'escaping-fixture',
    meta: { name: '<script>alert(1)</script>', base_servings: 2, source: 'https://example.com' },
    ingredients: [{ name: 'a < b', vol_est: '<b>1 cup</b>', qty_g: 100 }],
    steps: ['Stir <script>alert(2)</script>.'],
    science_notes: [],
    dietary_information: {}
  });
  assert.equal(html.includes('<script>alert(1)</script>'), false);
  assert.equal(html.includes('<script>alert(2)</script>'), false);
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
});
