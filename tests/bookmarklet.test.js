'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const yaml = require('js-yaml');
const scraper = require('../src/bookmarklet/recipe-scraper');

const recipeNode = (overrides = {}) => ({
  '@type': 'Recipe',
  name: 'Test Recipe',
  recipeYield: '4 servings',
  totalTime: 'PT30M',
  url: 'https://example.com/recipe',
  recipeIngredient: ['1 cup flour', '2 g salt'],
  recipeInstructions: ['Mix.'],
  ...overrides
});

test('parses a Recipe inside @graph', () => {
  const result = scraper.parseRecipeJsonLd([{ '@graph': [recipeNode()] }], 'https://example.com/page');
  assert.ok(result);
  assert.equal(result.meta.name, 'Test Recipe');
  assert.equal(result.ingredients.length, 2);
});

test('chooses the first Recipe when multiple recipes are present', () => {
  const result = scraper.parseRecipeJsonLd([
    recipeNode({ name: 'First' }),
    recipeNode({ name: 'Second' })
  ], 'https://example.com/page');
  assert.equal(result.meta.name, 'First');
});

test('flattens structured HowToSection and HowToStep instructions', () => {
  const result = scraper.parseRecipeJsonLd([recipeNode({
    recipeInstructions: [{
      '@type': 'HowToSection',
      name: 'Method',
      itemListElement: [
        { '@type': 'HowToStep', text: 'Boil water.' },
        { '@type': 'HowToStep', text: 'Add pasta.' }
      ]
    }]
  })], 'https://example.com/page');
  assert.deepEqual(Array.from(result.steps), ['Boil water.', 'Add pasta.']);
});

test('titles with colons and ingredient quotes survive YAML serialization', () => {
  const result = scraper.parseRecipeJsonLd([recipeNode({
    name: 'Soup: The "Best" Version',
    recipeIngredient: ['1 "large" onion', '2 cups stock: hot']
  })], 'https://example.com/page');
  const text = scraper.recipeToYaml(result);
  const parsed = yaml.load(text);
  assert.equal(parsed.meta.name, 'Soup: The "Best" Version');
  assert.equal(parsed.ingredients.length, 2);
  assert.match(parsed.ingredients[0].name, /onion/);
});

test('unicode fractions are normalized for parsing but preserved in vol_est', () => {
  const result = scraper.parseRecipeJsonLd([recipeNode({
    recipeIngredient: ['½ cup sugar', '1½ cups stock', 'salt']
  })], 'https://example.com/page');
  assert.equal(result.ingredients[0].qty_g, null);
  assert.equal(result.ingredients[0].name, 'sugar');
  assert.equal(result.ingredients[0].vol_est, '½ cup sugar');
  assert.equal(result.ingredients[1].qty_g, null);
  assert.equal(result.ingredients[1].name, 'stock');
  assert.equal(result.ingredients[1].vol_est, '1½ cups stock');
  assert.equal(result.ingredients[1].quantity_source.method, 'unknown');
  assert.equal(result.ingredients[2].qty_g, null);
  assert.equal(result.ingredients[2].quantity_source.method, 'unknown');
});

test('explicit mass is converted and original text is retained', () => {
  const result = scraper.parseRecipeJsonLd([recipeNode({
    recipeIngredient: ['1.5 kg potatoes', '8 oz cream cheese', '2 tbsp oil', '1/2 kg carrots']
  })], 'https://example.com/page');
  assert.equal(result.ingredients[0].qty_g, 1500);
  assert.equal(result.ingredients[1].qty_g, 227);
  assert.equal(result.ingredients[2].qty_g, null);
  assert.equal(result.ingredients[2].quantity_source.method, 'unknown');
  assert.equal(result.ingredients[3].qty_g, 500);
});

test('missing source metadata falls back to the page URL and missing yield stays unknown', () => {
  const node = recipeNode({ url: undefined, recipeYield: undefined });
  const result = scraper.parseRecipeJsonLd([node], 'https://example.com/fallback');
  assert.equal(result.meta.source, 'https://example.com/fallback');
  assert.equal(result.meta.base_servings, null);
  const parsed = yaml.load(scraper.recipeToYaml(result));
  assert.equal(parsed.meta.base_servings, null);
});

test('unexpected structures return null instead of a fabricated recipe', () => {
  assert.equal(scraper.parseRecipeJsonLd([{ '@type': 'Article' }], 'https://example.com'), null);
  assert.equal(scraper.parseRecipeJsonLd([recipeNode({ name: '' })], 'https://example.com'), null);
});

test('the generated bookmarklet URL is syntactically valid JavaScript', () => {
  const code = scraper.buildBookmarkletCode();
  assert.match(code, /^javascript:/);
  const source = decodeURIComponent(code.slice('javascript:'.length));
  assert.doesNotThrow(() => new Function(source));
  assert.match(source, /parseRecipeJsonLd/);
  assert.match(source, /recipeToYaml/);
});
