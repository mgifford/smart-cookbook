#!/usr/bin/env node

/**
 * Generate a searchable recipe index (recipes.json)
 * Run: node scripts/generate-index.js
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const RECIPES_DIR = path.join(__dirname, '..', 'recipes');
const OUTPUT_FILE = path.join(__dirname, '..', 'recipes.json');

async function main() {
  console.log('\n📋 Generating recipe index...\n');

  if (!fs.existsSync(RECIPES_DIR)) {
    console.error(`❌ Recipes directory not found: ${RECIPES_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(RECIPES_DIR).filter(f => f.endsWith('.yaml'));
  const index = {
    version: '1.0',
    generated: new Date().toISOString(),
    recipes: []
  };

  for (const filename of files) {
    const filepath = path.join(RECIPES_DIR, filename);
    try {
      const content = fs.readFileSync(filepath, 'utf8');
      const recipe = yaml.load(content);

      const recipeId = filename.replace('.yaml', '');
      const meta = recipe.meta || {};

      index.recipes.push({
        id: recipeId,
        name: meta.name || 'Unnamed Recipe',
        source: meta.source || '',
        servings: meta.base_servings || 1,
        prep_time: meta.prep_time || '',
        cook_time: meta.cook_time || '',
        ingredients_count: (recipe.ingredients || []).length,
        steps_count: (recipe.steps || []).length,
        has_science_notes: Array.isArray(recipe.science_notes) && recipe.science_notes.length > 0
      });

      console.log(`  ✓ ${meta.name || filename}`);
    } catch (err) {
      console.error(`  ❌ ${filename}: ${err.message}`);
    }
  }

  // Sort by name
  index.recipes.sort((a, b) => a.name.localeCompare(b.name));

  // Write index file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index, null, 2));
  console.log(`\n✅ Generated ${index.recipes.length} recipes`);
  console.log(`📄 Index saved to: recipes.json\n`);

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
