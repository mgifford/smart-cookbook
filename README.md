# 🧪 The Science Cookbook

A **personal, science-based smart cookbook** that runs client-side on GitHub Pages. There is no account or application backend: recipes are stored as YAML in the repository, and personal recipes/preferences live in your browser's localStorage. The current build still loads three libraries from a CDN, so first-load offline use is **not** yet guaranteed.

## ✨ Features

### 🎯 Core Functionality
- **Precision Scaling**: Scale from 1 to 64 servings, with gram-based precision and approximate household measures
- **Unit Preferences**: Switch between g/oz, cups/ml, and C/F on the fly
- **YAML Import/Export**: Shared schema validation for repository and browser data, with preserved unknown fields and stable IDs
- **Bookmarklet Scraper**: One-click import from recipe websites (AllRecipes, etc.)
- **LocalStorage Persistence**: Recipes, preferences, selection, and cooking experiments stay in your browser

### 🥗 Dietary Modes
- **Weight-conscious Mode** (`wwMode`): Shows lower-point substitution suggestions; it does **not** change quantities automatically
- **Vegetarian Mode** (`vegMode`): Shows plant-based substitution suggestions; it does **not** change quantities automatically
- **Precision Mode**: Show exact gram measurements instead of approximate volumes

### 🔬 Science Education
- **Science Mode** (`scienceMode`): Reveals the chemistry behind your cooking
  - Shows ingredient **functions** (structure, fat, leavening, moisture, flavor)
  - Displays **science notes** explaining substitutions (e.g., "Plant fat replaces dairy; same richness")
  - **Cooking Science Panel**: Explains techniques like:
    - Why overripe bananas make better banana bread (starches→sugars)
    - How baking soda reacts with acids to create rise
    - Maillard reaction creating browning and flavor at 175C
    - Why folding (vs. beating) prevents tough textures

### 🍄 Adaptation case study: Crispy Mushroom Mac and Cheese

[Crispy Mushroom Mac and Cheese (Weeknight)](recipes/crispy-mushroom-mac-and-cheese.yaml) is an **original, proposed adaptation** inspired by Dyan Solomon's *Olive + Gourmando: The Cookbook* (p. 129). It is not a reproduction of the cookbook and has not been kitchen-tested yet.

It demonstrates how to:

- Simplify a multi-component restaurant recipe into a weeknight dish.
- Replace expensive or specialty ingredients with ordinary supermarket ones.
- Use purchased bread instead of building flatbread and croutons from scratch.
- Choose equipment for a desired texture, with flat cast iron as the default and a ridged grill pan as an explicit experiment.
- Keep the memorable characteristics: deep mushroom flavour, a rich cheese sauce, and a crisp top, with a browned bottom as a tested goal rather than a promise.
- Record adaptations and real cooking observations instead of claiming results that have not happened.

The recipe's `meta.notes` records its status, equipment, options, and limitations. The [kitchen test plan](docs/crispy-mushroom-mac-and-cheese-testing.md) provides blank observation tables, a flat-vs-ridged comparison, cost and time worksheets, and sources. Direct links such as `index.html?recipe=crispy-mushroom-mac-and-cheese` now open the requested recipe.

### 🧪 Local cooking experiments

The recipe view includes an optional experiment form for recording actual cooking outcomes: equipment, pan size, surface, stovetop method, oven conditions, ratings, elapsed time, cost, and notes.

- Experiments are saved in this browser only.
- Unanswered ratings stay `null`; they are never filled with invented values.
- Two experiments can be compared in a semantic table (for example, flat versus ridged cast iron).
- Experiment JSON can be exported and re-imported.
- Recording an experiment does not mark the recipe “tested” or change its authored YAML.

## ⚠️ Current limitations

- **Not every recipe is kitchen-tested.** Testing status is recorded per recipe; untested or proposed adaptations stay labelled.
- **Offline use is incomplete.** The app is static and has no backend, but it depends on CDN-hosted libraries and has no service worker yet.
- **Dietary toggles are suggestions, not automatic replacements.** Always review a substitution before applying it.
- **Bookmarklet output still needs review.** It preserves unknown quantities and source text, but science notes and some metadata may need completion before an import passes validation.
- **Source-versus-adaptation comparison is limited.** The repository does not reproduce the cookbook’s original quantities, so comparisons use recorded local experiments and documented provenance rather than fabricated source data.
- **Nutrition is approximate and coverage-aware.** Missing reference data is disclosed instead of silently treated as zero.
- **Automated axe checks are evidence, not WCAG 2.2 AA certification.** Manual screen-reader, keyboard, zoom, forced-colours, and touch testing is still required.
- **No AI or WebMCP features are implemented.** Any future assistant work must be optional, proposal-based, and human-approved.
- **Licensing needs review.** The repository currently contains both an AGPL-3.0 `LICENSE` and a CC BY-SA 4.0 `LICENSE.md`; see [docs/LICENSING.md](docs/LICENSING.md) and have the project owner resolve the conflict.

## 📂 Files

- **recipes/** — Recipe YAML files (validated, indexed, searchable)
- **schemas/** — Versioned JSON Schema for recipe data
- **src/recipes/validation.js** — Dependency-free shared validator used by browser imports and Node tests
- **src/bookmarklet/recipe-scraper.js** — Single source for JSON-LD scraping and safe YAML serialization
- **src/generated/** — Generated schema/conversion modules; never edit by hand
- **experiments/** — Kitchen-experiment templates (unfilled observations only)
- **tests/** — Node fixtures for scaling, units, import/export, nutrition, and deep links
- **docs/** — [architecture](docs/ARCHITECTURE.md), [baseline audit](docs/BASELINE.md), [data model](docs/DATA-MODEL.md), [accessibility testing](docs/ACCESSIBILITY-TESTING.md), [experiment model](docs/RECIPE-EXPERIMENTS.md), [AI governance](docs/AI-GOVERNANCE.md), [licensing status](docs/LICENSING.md), the [Milestone 1 implementation report](docs/IMPLEMENTATION-REPORT-MILESTONE-1.md), the [1.1/1.2 implementation report](docs/IMPLEMENTATION-REPORT-1.1-1.2.md), and the [mushroom mac test plan](docs/crispy-mushroom-mac-and-cheese-testing.md)
- **recipes.json** — Auto-generated index of all recipes (metadata only)
- **recipes-index.html** — Searchable recipe browser with filters
- **template.yaml** — Recipe schema with science fields
- **bookmarklet.js** — Generated bookmarklet URL; source is `src/bookmarklet/recipe-scraper.js`
- **index.html** — Main app with Alpine.js, nutrition, copyright education, debug mode
- **script.js** — Scaling, substitutions, unit conversions, nutrition calculations
- **conversions.yaml** — Reference data for densities and unit conversions
- **nutrition.yaml** — Per-100g macros for 50+ common ingredients
- **ingredients-glossary.yaml** — Maps ingredient name variations to canonical names
- **scripts/validate-schema.js** — JSON Schema, stable-ID, and duplicate-ID checks
- **scripts/generate-schema-module.js** — Generates the browser schema module
- **scripts/generate-conversions.js** — Generates browser conversion data from conversions.yaml
- **scripts/validate-recipes.js** — Recipe quality validation
- **scripts/generate-index.js** — Generates searchable recipes.json
- **scripts/check-index.js** — Fails when recipes.json is stale
- **scripts/ci-a11y.js** — Playwright journeys plus axe checks on both pages and mobile
- **.github/workflows/quality.yml** — Full quality gate on pushes and pull requests
- **.github/workflows/validate.yml** — Recipe schema/index checks without auto-commits
- **AGENTS.md** — AI assistant personas for development
- **PHILOSOPHY.md** — Why open recipes matter + remix culture vision
- **COPYRIGHT.md** — Complete legal guide to recipe copyright
- **LICENSE.md** — CC BY-SA 4.0 license terms
- **QUICKSTART.md** — 60-second guide to open recipe culture
- **RECIPE-AUTHORING.md** — Standards for creating recipes
- **README.md** — This file

## 🚀 Usage

### Local Development
```bash
python3 -m http.server 8010
# Visit http://localhost:8010
```

### GitHub Pages Deployment
1. Push to GitHub
2. Enable Pages in Settings → Pages → Source: `main` branch
3. Your cookbook will be live at `https://yourusername.github.io/smart-cookbook/`

### Adding Recipes

**Method 1: Browse the recipe library**
1. Go to https://mgifford.github.io/smart-cookbook/
2. Open [recipes-index.html](recipes-index.html) or pick a recipe from the dropdown
3. Use a direct link such as `index.html?recipe=crispy-mushroom-mac-and-cheese`
4. The app loads the recipe YAML on demand

**Method 2: Bookmarklet Scraper**
1. Drag the "Save to Cookbook" link to your bookmarks bar
2. Visit any recipe website with JSON-LD data (AllRecipes, etc.)
3. Click the bookmarklet → YAML copied to clipboard
4. Paste into YAML Import section → Load YAML

**Method 3: Manual YAML**
1. Copy [template.yaml](template.yaml)
2. Fill in your recipe details (see RECIPE-AUTHORING.md for standards)
3. Paste into YAML Import → Load YAML

**Method 4: Submit to Repository**
1. Create a new file: `recipes/your-recipe-name.yaml`
2. Follow [RECIPE-AUTHORING.md](RECIPE-AUTHORING.md) standards
3. Push to GitHub
4. Run `npm run index:recipes` and commit the regenerated `recipes.json`
5. GitHub Actions validates the recipe and fails if the index is stale
6. Recipe appears in the searchable browser at [recipes-index.html](recipes-index.html)

## ✅ Quality Assurance

All recipes are **validated automatically**, and CI checks that the generated index is current:

### Validation Checklist
- ✅ Required fields: `meta`, `ingredients`, `steps`, `science_notes`, `history`
- ✅ Valid metadata: name, source, servings (positive number), prep_time
- ✅ Ingredients: each has name, qty_g (number or null), vol_est, function, ww_points
- ✅ Substitutions: each has name, ratio, science_note
- ✅ Repeated ingredient names with different roles are preserved
- ✅ Minimum 2 ingredients, 1 step, 1 science note
- ✅ JSON Schema validation and stable IDs matching filenames
- ✅ No duplicate recipe IDs
- ✅ Generated index is synchronized with the YAML source
- ✅ Unit fixtures plus Playwright/axe journeys pass

### Run Locally
```bash
npm ci
npm run validate:schema    # Versioned JSON Schema + stable IDs
npm run generate:schema-module # Regenerate src/generated/recipe-schema.js
npm run check:schema-module # Browser schema copy is synchronized
npm run validate:recipes   # Recipe quality checks
npm run generate:conversions # Regenerate src/generated/conversions.js after YAML changes
npm run check:conversions  # Fail if generated conversion data is stale
npm run build:bookmarklet   # Regenerate bookmarklet.js from the single source
npm run check:bookmarklet  # Fail if the generated bookmarklet is stale
npm run check:index        # Fail if recipes.json is stale
npm run test:unit          # Scaling, conversion, import/export fixtures
npm run index:recipes      # Regenerate recipes.json after recipe changes
npm run quality            # Full local quality gate
```

### Automatic CI/CD
Checks run on pushes and pull requests:
1. **Validation** — YAML, JSON Schema, recipe quality, and stable IDs
2. **Index integrity** — Fails if `recipes.json` is stale; run `npm run index:recipes` locally
3. **Tests** — Unit fixtures plus Playwright user journeys and axe scans
4. **Block merging** — Fails on genuine validation, automation, or accessibility errors

Generated files are not auto-committed from pull requests. `npm run quality` is the local equivalent.

## 🔍 Recipe Browser

Visit [recipes-index.html](recipes-index.html) to:
- 🔎 **Search** recipes by name
- 👥 **Filter** by minimum servings
- ⏱️ **Filter** by max prep time
- 🔬 **Filter** recipes with science notes
- Click any recipe → opens in main app

This index auto-updates whenever recipes are validated.

## 🧪 Science Features in Action

### Vegetarian Substitutions
When `vegMode` is enabled:
- **Butter** → Coconut oil (same richness, plant-based)
- **Chicken breast** → Firm tofu (press to remove water, marinate for flavor)
- **Milk** → Almond milk (add 5g flour to compensate for lower protein)

Substitutions appear as an icon and tooltip with a science note. They are **suggestions only**; the recipe quantities are not changed silently.

### Science Mode Explanations
Toggle `scienceMode` to see:
- **Ingredient functions** in gray: `(structure)`, `(fat)`, `(leavening)`
- **Substitution science** in green: "More bran cuts gluten; add 10g water"
- **Cooking Science Panel** with explanations like:
  - "Baking soda reacts with acidic bananas to produce CO₂ gas"
  - "Maillard reaction creates browning and nutty flavors at 175C"

## 📜 Open Culture & Copyright

Recipes are **humanity's shared inheritance**. The Science Cookbook embraces open culture principles:

- **Ingredient lists are NOT copyrighted** (by law and by design)
- **Use any recipe as a starting point** for your own cooking
- **Share improvements** with the community
- **Credit sources** when possible (respectful, not legally required)
- **Licensed under CC BY-SA 4.0**: Share freely, give credit, share improvements

### Learn About Open Recipes

| Document | Purpose |
|----------|---------|
| [QUICKSTART.md](QUICKSTART.md) | 60-second guide for users & creators |
| [PHILOSOPHY.md](PHILOSOPHY.md) | Vision: why open recipes matter + remix culture |
| [COPYRIGHT.md](COPYRIGHT.md) | Complete legal guide to recipe copyright law |
| [LICENSE.md](LICENSE.md) | CC BY-SA 4.0 license terms & how to apply |

### Key Principles
1. **Ingredient lists are free** — Facts can't be copyrighted
2. **Your voice is protected** — Photos, stories, descriptions are copyrighted
3. **Remix is culture** — Adapt recipes to your context
4. **Attribution is respectful** — Credit sources, legally not required
5. **Improvements benefit everyone** — Share what you learn

- **Vanilla CSS** - Dark theme optimized for kitchen use; no Tailwind build step
- **Alpine.js** (CDN) - Reactive state management
- **js-yaml** (CDN) - YAML parsing, plus JSZip for downloads
- **No backend or account** - Static GitHub Pages hosting
- **Pinned CDN assets** - Alpine, js-yaml, and JSZip use exact versions with Subresource Integrity; the app still depends on the CDN and has no service worker yet

## 📝 Example Workflow

1. **Find a recipe** on AllRecipes.com
2. **Click bookmarklet** → YAML copied
3. **Paste and Load** → Recipe imported
4. **Toggle Science Mode** → See ingredient chemistry
5. **Enable Vegetarian Mode** → Review substitution suggestions (apply changes manually)
6. **Scale to 12 servings** → All ingredients update
7. **Switch to Fahrenheit** → Temperatures convert in steps
8. **Export YAML** → Save to Git for version control

## 📋 Ingredient Glossary & Gram Conversions

The app uses an **`ingredients-glossary.yaml`** file that maps ingredient name variations to canonical names. This means:
- "ripe banana" → "banana" (nutrition lookup works)
- "plain flour" → "all-purpose flour" (nutrition lookup works)
- "shredded cheddar" → "cheddar cheese" (nutrition lookup works)

### Quick Gram Conversion Reference

When editing recipe YAML, use these common conversions for `qty_g`:

| Item | Amount | Grams |
|------|--------|-------|
| **Flours & Starches** |
| All-purpose flour | 1 cup | 120g |
| Whole wheat flour | 1 cup | 130g |
| Cornstarch | 1 tablespoon | 8g |
| **Sugars** |
| Granulated sugar | 1 cup | 200g |
| Brown sugar | 1 cup | 220g |
| Honey | 1 tablespoon | 21g |
| Maple syrup | 1 tablespoon | 20g |
| **Fats** |
| Butter | 1 cup | 227g |
| Butter | 1 tablespoon | 14g |
| Olive oil | 1 tablespoon | 14g |
| Coconut oil | 1 cup | 200g |
| **Eggs & Dairy** |
| Large egg | 1 | 50g |
| Milk | 1 cup | 245g |
| Greek yogurt | 1 cup | 227g |
| Cream | 1 cup | 240g |
| **Vegetables & Fruits** |
| Banana | 1 medium | 120g |
| Banana | 1 large | 150g |
| Apple | 1 medium | 182g |
| Carrot | 1 medium | 61g |
| Tomato | 1 medium | 123g |
| Potato | 1 medium | 170g |
| Onion | 1 medium | 150g |
| **Proteins** |
| Chicken breast | 1 breast | 200g |
| Ground beef | 1 cup | 225g |
| Tofu | 1 cup | 240g |
| **Legumes & Grains** |
| Cooked chickpeas | 1 can (drained) | 270g |
| Cooked rice | 1 cup | 195g |
| Cooked pasta | 1 cup | 200g |
| **Nuts & Seeds** |
| Almond butter | 1 tablespoon | 16g |
| Peanut butter | 1 tablespoon | 16g |

**Pro tip:** When the bookmarklet imports a recipe, it tries to estimate `qty_g` from quantities like "1 cup flour" or "3 eggs". But it's always worth double-checking and refining the amounts!

### Fixed-Amount Ingredients (`no_scale: true`)

Some ingredients shouldn't scale with the servings slider. For example:
- **"2 cans (14-1/2 oz each) chicken broth"** — should stay as "2 cans" even if you 4x the recipe
- **"1 package (8 oz) cream cheese"** — doesn't become "4 packages"
- **"1 (14 oz) bag frozen spinach"** — stays as purchased

Mark these with `no_scale: true` in your recipe YAML:

```yaml
ingredients:
  - name: chicken broth
    qty_g: 411
    vol_est: "2 cans (14-1/2 oz each)"
    no_scale: true  # ← Stays as "2 cans" regardless of servings
    function: liquid, base
    ww_points: 0
    substitutions: []

  - name: all-purpose flour
    qty_g: 240
    vol_est: "2 cups"
    no_scale: false  # ← Scales normally (default)
    function: structure
```

**What happens with `no_scale: true`:**
- ✅ Ingredient displays at original amount (e.g., "2 cans")
- ✅ Nutrition still calculated correctly
- ✅ Does NOT change when servings slider moves
- ✅ User can still manually edit if needed

---

## 🐛 Debugging

### Enable Debug Mode

To troubleshoot recipe loading or state issues, append `?debug=true` to the URL:

```
http://localhost:8010/?debug=true
```

This displays a **red debug panel** at the top showing:

**State Variables:**
- `selectedId` — Currently selected recipe ID
- `recipes.length` — Total recipes loaded
- `current.meta.name` — Recipe name
- `current.ingredients.length` — Number of ingredient objects
- `current.steps.length` — Number of step objects
- `servings` — Current serving size

**Computed Values:**
- `displayIngredients().length` — Rendered ingredient count
- `stepsList().length` — Rendered step count
- `nutritionLoaded` — Whether nutrition data loaded successfully
- `nutritionError` — Error message (if any)

**Preferences:**
- `weightUnit`, `volumeUnit`, `tempUnit` — Current unit settings

### Browser Console Logs

Open the browser console (F12 → Console tab) to see detailed logs from:

| Function | Logs |
|----------|------|
| `init()` | Recipes array, selectedId, current recipe initialized |
| `loadRecipe()` | Selected ID, found recipe, ingredient/step counts |
| `displayIngredients()` | Rendered ingredients with quantities |
| `stepsList()` | Rendered steps with temp conversions |
| `loadNutritionData()` | nutrition.yaml fetch success/failure |

### Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Recipe dropdown empty | Alpine.js not initialized | Check `x-data="cookbookApp()"` on `<body>` |
| No ingredients shown | `current.ingredients` is empty | Verify recipe YAML has ingredients array |
| Nutrition unavailable | nutrition.yaml failed to load | Check Network tab for 404/CORS errors |
| Scaling broken | `servings` is 0 or undefined | Run `localStorage.clear()` and reload |
| Units not converting | Region detection failed | Check: `new Intl.DateTimeFormat().resolvedOptions()` |

### Clear Cached Data

If the app gets into a bad state:

```javascript
// In browser console (F12):
localStorage.clear();
location.reload();
```

This removes all cached recipes and preferences.

---

**Built with AI. 🧪 Seasoned with love. ❤️**

