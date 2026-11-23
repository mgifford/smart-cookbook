#!/usr/bin/env node
'use strict';

/**
 * Generate one focused, static HTML page per recipe.
 * These pages contain no app shell, bookmarklet, or technical tools.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..');
const RECIPES_DIR = path.join(ROOT, 'recipes');
const SITE_URL = process.env.SITE_URL || 'https://mgifford.github.io/smart-cookbook';

const escapeHtml = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const safeUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
  } catch (_) {
    return '';
  }
};

const plain = (value) => String(value == null ? '' : value).replace(/\s+/g, ' ').trim();

const ingredientText = (ingredient) => {
  const name = plain(ingredient.name);
  const volume = plain(ingredient.vol_est);
  let text = volume || (Number.isFinite(ingredient.qty_g) ? `${ingredient.qty_g} g ${name}` : name);
  const words = name.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2);
  const matched = words.filter((word) => text.toLowerCase().includes(word)).length;
  if (name && words.length && matched / words.length < 0.5) text = `${text} — ${name}`;
  if (ingredient.optional) text += ' (optional)';
  if (ingredient.estimated) text += ' (estimated)';
  return text;
};

const formatDuration = (value) => {
  const text = plain(value);
  if (!text) return '';
  const match = text.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/i);
  if (!match) return text;
  const parts = [];
  if (match[1]) parts.push(`${match[1]} hr`);
  if (match[2]) parts.push(`${match[2]} min`);
  return parts.join(' ') || text;
};

const dietarySummary = (recipe) => {
  const diet = recipe.dietary_information || {};
  const parts = [];
  if (diet.vegetarian === true) parts.push('Vegetarian: marked yes');
  else if (diet.vegetarian === false) parts.push('Vegetarian: marked no');
  else parts.push('Vegetarian: not recorded');
  if (diet.vegan === true) parts.push('Vegan: marked yes');
  else if (diet.vegan === false) parts.push('Vegan: marked no');
  else parts.push('Vegan: not recorded');
  return parts.join(' · ');
};

const renderDietary = (recipe) => {
  const diet = recipe.dietary_information || {};
  const lines = [];
  if (diet.vegetarian === true) lines.push('This recipe is marked vegetarian: it contains no meat, poultry, fish, or shellfish. Dairy and eggs may remain.');
  if (diet.vegetarian === false) lines.push('This recipe is marked not vegetarian.');
  if (diet.vegan === true) lines.push('This recipe is marked vegan: it contains no animal-derived ingredients.');
  if (diet.vegan === false) lines.push('This recipe is marked not vegan.');
  if (!lines.length) lines.push('Dietary status has not been recorded for this recipe.');
  if (diet.notes) lines.push(plain(diet.notes));
  return `<p>${escapeHtml(lines.join(' '))}</p>
        <details>
          <summary>What these labels mean</summary>
          <p><strong>Vegetarian</strong> means no meat, poultry, fish, or shellfish. Dairy and eggs may remain. Cheeses can use animal rennet, so check labels if that matters to you.</p>
          <p><strong>Vegan</strong> means no animal-derived ingredients at all, including dairy, eggs, honey, gelatin, and animal rennet. A vegetarian recipe is not automatically vegan.</p>
          <p>These are guidance labels, not certification. Ingredient brands and processing aids vary.</p>
        </details>`;
};

const renderRecipePage = (recipe) => {
  const meta = recipe.meta || {};
  const id = recipe.id;
  const name = plain(meta.name || id);
  const source = safeUrl(meta.source);
  const description = plain(recipe.provenance?.notes || (recipe.desired_outcomes || []).join('; ') || meta.notes || `A recipe from the Science-Based Smart Cookbook: ${name}`).slice(0, 180);
  const sourceLine = source
    ? `<a href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer">Source</a>`
    : escapeHtml(meta.source || 'Source not recorded');
  const status = meta.status || recipe.testing_status || '';
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
  const science = Array.isArray(recipe.science_notes) ? recipe.science_notes : [];
  const notes = plain(meta.notes);
  const diet = dietarySummary(recipe);
  const timeParts = [meta.prep_time && { label: 'Prep', value: formatDuration(meta.prep_time) }, meta.cook_time && { label: 'Cook', value: formatDuration(meta.cook_time) }].filter(Boolean);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(name)} — Science-Based Smart Cookbook</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeHtml(name)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(`${SITE_URL}/recipes/${id}.html`)}" />
  <link rel="canonical" href="${escapeHtml(`${SITE_URL}/recipes/${id}.html`)}" />
  <link rel="stylesheet" href="../recipe.css" />
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to recipe</a>
  <header class="site-header">
    <a href="../index.html">← All recipes</a>
    <a href="../recipes-index.html">Recipe index</a>
  </header>
  <main id="main-content" tabindex="-1">
    <article>
      <header class="recipe-header">
        <p class="eyebrow">Recipe</p>
        <h1>${escapeHtml(name)}</h1>
        <p class="source">${sourceLine}</p>
        ${status ? `<p class="status">${escapeHtml(status)}</p>` : ''}
        <dl class="recipe-meta">
          <div><dt>Servings</dt><dd>${escapeHtml(meta.base_servings || 'Not recorded')}</dd></div>
          ${timeParts.map((part) => `<div><dt>${escapeHtml(part.label)}</dt><dd>${escapeHtml(part.value)}</dd></div>`).join('\n          ')}
          <div><dt>Dietary</dt><dd>${escapeHtml(diet)}</dd></div>
        </dl>
      </header>

      <nav class="recipe-jump" aria-label="Recipe sections">
        <a href="#ingredients">Ingredients</a>
        <a href="#steps">Directions</a>
        ${science.length ? '<a href="#science">Why this works</a>' : ''}
        <a href="#dietary">Dietary notes</a>
        ${notes ? '<a href="#notes">Cook’s notes</a>' : ''}
      </nav>

      <section id="ingredients">
        <h2>Ingredients</h2>
        <ul class="ingredients">
          ${ingredients.map((ingredient) => `<li>${escapeHtml(ingredientText(ingredient))}</li>`).join('\n          ')}
        </ul>
      </section>

      <section id="steps">
        <h2>Directions</h2>
        <ol class="directions">
          ${steps.map((step, index) => `<li id="step-${index + 1}">${escapeHtml(step)}</li>`).join('\n          ')}
        </ol>
      </section>

      ${science.length ? `<section id="science">
        <details>
          <summary>Why this works</summary>
          <ul>${science.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul>
        </details>
      </section>` : ''}

      <section id="dietary">
        <h2>Dietary notes</h2>
        ${renderDietary(recipe)}
      </section>

      ${notes ? `<section id="notes">
        <h2>Cook’s notes</h2>
        <p class="recipe-notes-text">${escapeHtml(notes)}</p>
      </section>` : ''}

      <footer class="recipe-footer">
        <p><a href="../index.html">← Back to all recipes</a></p>
        <p>Recipe data: <a href="./${escapeHtml(id)}.yaml">YAML source</a>. <a href="../index.html?recipe=${encodeURIComponent(id)}">Open interactive version</a> for scaling, substitutions, nutrition coverage, and local experiments.</p>
        <p class="license">Science-Based Smart Cookbook. See the repository for licensing and attribution.</p>
      </footer>
    </article>
  </main>
</body>
</html>
`;
  return html.replace(/[ \t]+$/gm, '');
};

const listRecipeFiles = () => fs.readdirSync(RECIPES_DIR)
  .filter((file) => file.endsWith('.yaml'))
  .sort();

const buildPages = () => {
  const pages = [];
  for (const file of listRecipeFiles()) {
    const fullPath = path.join(RECIPES_DIR, file);
    const recipe = yaml.load(fs.readFileSync(fullPath, 'utf8'));
    if (!recipe || !recipe.meta) continue;
    const id = recipe.id || path.basename(file, '.yaml');
    pages.push({
      id,
      file: path.join(RECIPES_DIR, `${id}.html`),
      html: renderRecipePage({ ...recipe, id })
    });
  }
  return pages;
};

const main = () => {
  const pages = buildPages();
  pages.forEach((page) => fs.writeFileSync(page.file, page.html));
  console.log(`Generated ${pages.length} static recipe page(s).`);
};

if (require.main === module) main();
module.exports = { buildPages, renderRecipePage, escapeHtml };
