/*
 * Single source for the Smart Cookbook bookmarklet and its pure helpers.
 * The browser app loads this module and derives the bookmarklet URL from the
 * two self-contained functions below. bookmarklet.js is generated from it.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RecipeScraper = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function parseRecipeJsonLd(blocks, pageUrl) {
    const fractionMap = { '½': '1/2', '¼': '1/4', '¾': '3/4', '⅓': '1/3', '⅔': '2/3', '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5', '⅙': '1/6', '⅚': '5/6', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8' };
    const normalize = (value) => String(value == null ? '' : value)
      .replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, '')
      .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const normalizeFractions = (value) => {
      let text = normalize(value);
      Object.keys(fractionMap).forEach((fraction) => {
        text = text.replace(new RegExp('(\\d)\\s*' + fraction, 'g'), `$1 ${fractionMap[fraction]}`);
        text = text.split(fraction).join(fractionMap[fraction]);
      });
      return text;
    };
    const hasRecipeType = (node) => {
      if (!node || typeof node !== 'object') return false;
      const type = node['@type'];
      return Array.isArray(type) ? type.includes('Recipe') : type === 'Recipe';
    };
    const collectNodes = (value, target) => {
      if (Array.isArray(value)) {
        value.forEach((item) => collectNodes(item, target));
        return;
      }
      if (!value || typeof value !== 'object') return;
      target.push(value);
      if (Array.isArray(value['@graph'])) collectNodes(value['@graph'], target);
      if (value.mainEntity) collectNodes(value.mainEntity, target);
      if (value.mainEntityOfPage && typeof value.mainEntityOfPage === 'object') collectNodes(value.mainEntityOfPage, target);
    };
    const nodes = [];
    collectNodes(blocks, nodes);
    const recipe = nodes.find(hasRecipeType);
    if (!recipe) return null;
    const name = normalize(recipe.name);
    if (!name) return null;

    let source = recipe.url || recipe.mainEntityOfPage || pageUrl || '';
    if (source && typeof source === 'object') source = source['@id'] || source.url || '';

    const parseYield = (value) => {
      const first = Array.isArray(value) ? value[0] : value;
      const match = normalize(first).match(/[0-9]+(?:\.[0-9]+)?/);
      return match ? Number(match[0]) : null;
    };
    const parseQuantity = (rawValue) => {
      const original = normalize(rawValue);
      const text = normalizeFractions(original);
      const match = text.match(/^([0-9]+(?:\s+[0-9]+\/[0-9]+|\/[0-9]+|\.[0-9]+)?)\s*([a-zA-Z.]+)?\s*(.*)$/);
      if (!match) {
        return {
          name: text,
          qty_g: null,
          vol_est: original,
          estimated: false,
          quantity_source: { original, method: 'unknown', reviewed: false }
        };
      }
      const number = match[1].trim();
      const unit = (match[2] || '').toLowerCase().replace(/\.$/, '');
      const rest = (match[3] || '').trim();
      const mass = { g: 1, gram: 1, grams: 1, kg: 1000, kilogram: 1000, kilograms: 1000, oz: 28.3495, ounce: 28.3495, ounces: 28.3495, lb: 453.592, lbs: 453.592, pound: 453.592, pounds: 453.592 };
      const volume = ['ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters', 'cup', 'cups', 'tbsp', 'tablespoon', 'tablespoons', 'tsp', 'teaspoon', 'teaspoons'];
      let quantity = null;
      let method = 'unknown';
      const parseNumberToken = (token) => {
        const value = String(token).trim();
        const mixed = value.match(/^(\d+)\s+(\d+)\/(\d+)$/);
        if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
        const fraction = value.match(/^(\d+)\/(\d+)$/);
        if (fraction) return Number(fraction[1]) / Number(fraction[2]);
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : NaN;
      };
      const numeric = parseNumberToken(number);
      if (Number.isFinite(numeric) && mass[unit]) {
        quantity = Math.round(numeric * mass[unit]);
        method = 'explicit';
      }
      const knownUnit = Boolean(mass[unit] || volume.includes(unit));
      const cleanedName = knownUnit && rest ? rest : text.replace(/^\s*[0-9][0-9.,/\s]*\s*/, '').trim();
      return {
        name: cleanedName || text,
        qty_g: quantity,
        vol_est: original,
        estimated: false,
        quantity_source: { original, method, reviewed: false }
      };
    };
    const collectInstructions = (value, target) => {
      if (typeof value === 'string') {
        const text = normalize(value);
        if (text) target.push(text);
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((item) => collectInstructions(item, target));
        return;
      }
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value.itemListElement)) {
        value.itemListElement.forEach((item) => collectInstructions(item, target));
        return;
      }
      if (Array.isArray(value.steps)) {
        value.steps.forEach((item) => collectInstructions(item, target));
        return;
      }
      if (typeof value.text === 'string') {
        const text = normalize(value.text);
        if (text) target.push(text);
        return;
      }
      if (typeof value.name === 'string' && value['@type'] !== 'HowToSection') {
        const text = normalize(value.name);
        if (text) target.push(text);
      }
    };

    const rawIngredients = recipe.recipeIngredient || recipe.ingredients || [];
    const ingredients = (Array.isArray(rawIngredients) ? rawIngredients : [rawIngredients])
      .map((item) => typeof item === 'string' ? item : item && (item.item || item.name || item.text))
      .filter(Boolean)
      .map(parseQuantity);

    const steps = [];
    collectInstructions(recipe.recipeInstructions || recipe.instructions || [], steps);

    return {
      schema_version: '2.0',
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'imported-recipe',
      meta: {
        name,
        source: normalize(source),
        base_servings: parseYield(recipe.recipeYield),
        prep_time: normalize(recipe.totalTime || recipe.prepTime || recipe.cookTime || '')
      },
      provenance: {
        type: 'source',
        status: 'untested',
        source_url: normalize(source),
        notes: 'Imported from Schema.org JSON-LD; not verified.'
      },
      testing_status: 'untested',
      ingredients,
      steps,
      science_notes: [],
      history: []
    };
  }

  function recipeToYaml(recipe) {
    const quote = (value) => JSON.stringify(String(value == null ? '' : value));
    const numberOrNull = (value) => typeof value === 'number' && Number.isFinite(value) ? value : null;
    const slug = (value) => String(value || 'imported-recipe').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'imported-recipe';
    const meta = recipe.meta || {};
    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
    const lines = [
      'schema_version: "2.0"',
      `id: ${slug(recipe.id || meta.name)}`,
      'meta:',
      `  name: ${quote(meta.name || 'Imported Recipe')}`,
      `  source: ${quote(meta.source || '')}`,
      `  base_servings: ${Number(meta.base_servings) > 0 ? Number(meta.base_servings) : 'null'}`,
      `  prep_time: ${quote(meta.prep_time || '')}`,
      'provenance:',
      '  type: source',
      '  status: untested',
      `  source_url: ${quote((recipe.provenance && recipe.provenance.source_url) || meta.source || '')}`,
      'testing_status: untested',
      'ingredients:'
    ];
    if (ingredients.length === 0) lines.push('  []');
    ingredients.forEach((ingredient) => {
      lines.push(`  - name: ${quote(ingredient.name)}`);
      lines.push(`    qty_g: ${numberOrNull(ingredient.qty_g) === null ? 'null' : numberOrNull(ingredient.qty_g)}`);
      lines.push(`    vol_est: ${quote(ingredient.vol_est)}`);
      lines.push(`    function: ${quote(ingredient.function || '')}`);
      lines.push('    ww_points: null');
      lines.push('    substitutions: []');
      lines.push(`    estimated: ${ingredient.estimated === true}`);
      lines.push('    quantity_source:');
      lines.push(`      original: ${quote((ingredient.quantity_source && ingredient.quantity_source.original) || ingredient.vol_est || '')}`);
      lines.push(`      method: ${quote((ingredient.quantity_source && ingredient.quantity_source.method) || 'unknown')}`);
      lines.push('      reviewed: false');
    });
    lines.push('steps:');
    if (steps.length === 0) lines.push('  []');
    steps.forEach((step) => lines.push(`  - ${quote(step)}`));
    lines.push('science_notes: []');
    lines.push('history: []');
    return lines.join('\n');
  }

  function buildBookmarkletCode() {
    const code = `(async()=>{try{${parseRecipeJsonLd.toString()}\n${recipeToYaml.toString()}\nconst blocks=[...document.querySelectorAll('script[type="application/ld+json"]')].map((el)=>{try{return JSON.parse(el.textContent)}catch(error){return null}}).filter(Boolean);const recipe=parseRecipeJsonLd(blocks,location.href);if(!recipe)throw new Error('No Schema.org Recipe JSON-LD found');const yaml=recipeToYaml(recipe);await navigator.clipboard.writeText(yaml);alert('Recipe YAML copied. Review quantities, science notes, and source before importing.');}catch(error){alert('Bookmarklet error: '+error.message)}})();`;
    return `javascript:${code.replace(/\n/g, '%0A')}`;
  }

  return { parseRecipeJsonLd, recipeToYaml, buildBookmarkletCode };
});
