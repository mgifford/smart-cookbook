#!/usr/bin/env node
'use strict';

/**
 * Generate the browser/Node conversion data from the canonical conversions.yaml.
 * Run: node scripts/generate-conversions.js
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_FILE = path.join(ROOT, 'conversions.yaml');
const OUTPUT_FILE = path.join(ROOT, 'src', 'generated', 'conversions.js');

const WHOLE_KEY_MAP = {
  eggs: 'egg',
  bananas: 'banana',
  apples: 'apple',
  oranges: 'orange',
  lemons: 'lemon',
  limes: 'lime',
  garlic_cloves: 'garlic clove',
  onions: 'onion',
  tomatoes: 'tomato',
  potatoes: 'potato',
  carrots: 'carrot',
  bell_peppers: 'bell pepper',
  cilantro_bunch: 'cilantro bunch',
  cinnamon_stick: 'cinnamon stick',
  mushrooms_whole: 'mushroom',
  avocados: 'avocado',
  lentils_dry: 'lentil dry'
};

const SIZE_MAP = { extra_large: 'xl' };

const normalizeKey = (text) => String(text || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .replace(/_+/g, '_');

function buildConversions() {
  const data = yaml.load(fs.readFileSync(SOURCE_FILE, 'utf8')) || {};
  const errors = [];

  const densitiesPerCup = { ...(data.densities_g_per_cup || {}) };
  Object.entries(densitiesPerCup).forEach(([key, value]) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      errors.push(`Density for "${key}" must be a positive number.`);
    }
  });

  const wholeUnitWeights = {};
  Object.entries(data.whole_units_to_grams || {}).forEach(([sourceKey, sizes]) => {
    const key = WHOLE_KEY_MAP[sourceKey] || sourceKey.replace(/_/g, ' ');
    const mapped = {};
    let explicitDefault = null;
    Object.entries(sizes || {}).forEach(([size, grams]) => {
      if (typeof grams !== 'number' || !Number.isFinite(grams) || grams <= 0) {
        errors.push(`Whole-unit weight for "${sourceKey}.${size}" must be a positive number.`);
        return;
      }
      if (size === 'default') {
        explicitDefault = grams;
        return;
      }
      mapped[SIZE_MAP[size] || size] = grams;
    });
    const fallback = explicitDefault
      || mapped.medium
      || Object.values(mapped).find((value) => typeof value === 'number');
    if (fallback) mapped.default = fallback;
    wholeUnitWeights[key] = mapped;
  });

  const packagedUnitWeights = {};
  Object.entries(data.packaged_units || {}).forEach(([key, grams]) => {
    if (!key.startsWith('can_')) return;
    if (typeof grams === 'number' && Number.isFinite(grams) && grams > 0) {
      packagedUnitWeights[key] = grams;
    }
  });

  const displayPrefs = {};
  const volume = data.volume_conversions_g || {};
  Object.entries((data.ingredient_display_prefs || {}).by_name || {}).forEach(([key, unit]) => {
    if (unit !== 'tsp' && unit !== 'tbsp') {
      errors.push(`Display unit for "${key}" must be tsp or tbsp.`);
      return;
    }
    const gramsPerUnit = volume[`${key}_${unit}`];
    if (typeof gramsPerUnit !== 'number' || !Number.isFinite(gramsPerUnit) || gramsPerUnit <= 0) {
      errors.push(`Missing volume_conversions_g entry for ${key}_${unit}.`);
      return;
    }
    displayPrefs[key.replace(/_/g, ' ')] = { unit, gramsPerUnit };
  });

  const aliases = {};
  Object.entries((data.ingredient_display_prefs || {}).aliases || {}).forEach(([key, value]) => {
    aliases[key.replace(/_/g, ' ')] = String(value).replace(/_/g, ' ');
  });

  const volumeFirst = (data.volume_first || [])
    .map(normalizeKey)
    .filter(Boolean);

  if (errors.length) {
    throw new Error(`Invalid conversions.yaml:\n- ${errors.join('\n- ')}`);
  }

  return { densitiesPerCup, wholeUnitWeights, packagedUnitWeights, displayPrefs, aliases, volumeFirst };
}

function buildModule() {
  const data = buildConversions();
  return `/* Generated from conversions.yaml. Do not edit by hand. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SmartCookbookConversions = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  return ${JSON.stringify(data, null, 2)};
});
`;
}

function main() {
  fs.writeFileSync(OUTPUT_FILE, buildModule());
  console.log(`Generated ${path.relative(ROOT, OUTPUT_FILE)}`);
}

if (require.main === module) main();
module.exports = { buildModule, buildConversions, OUTPUT_FILE, SOURCE_FILE };
