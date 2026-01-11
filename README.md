# 🧪 The Science Cookbook

A **personal, science-based smart cookbook** that runs entirely client-side on GitHub Pages. No backend required—all data is stored in YAML files and localStorage for complete privacy and offline-first capability.

## ✨ Features

### 🎯 Core Functionality
- **Precision Scaling**: Servings slider (0.25x to 200x) with gram-based accuracy
- **Unit Preferences**: Switch between g/oz, cups/ml, and C/F on the fly
- **YAML Import/Export**: Load and save recipes in clean, version-controlled YAML format
- **Bookmarklet Scraper**: One-click import from recipe websites (AllRecipes, etc.)
- **LocalStorage Persistence**: Your recipes and preferences auto-save to your browser

### 🥗 Dietary Modes
- **Weight-conscious Mode** (`wwMode`): Swap higher-point ingredients for lighter alternatives
- **Vegetarian Mode** (`vegMode`): Automatically suggest plant-based substitutions (chicken→tofu, butter→coconut oil)
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

## 📂 Files

- **recipes/** — Recipe YAML files (validated, indexed, searchable)
- **recipes.json** — Auto-generated index of all recipes (metadata only)
- **recipes-index.html** — Searchable recipe browser with filters
- **template.yaml** — Recipe schema with science fields
- **bookmarklet.js** — Scraper for JSON-LD recipe data with smart quantity parsing
- **load-recipes.js** — Loads all recipe YAMLs into localStorage
- **index.html** — Main app with Alpine.js, nutrition, copyright education, debug mode
- **script.js** — Scaling, substitutions, unit conversions, nutrition calculations
- **conversions.yaml** — Reference data for densities and unit conversions
- **nutrition.yaml** — Per-100g macros for 50+ common ingredients
- **ingredients-glossary.yaml** — Maps ingredient name variations to canonical names
- **scripts/validate-recipes.js** — Recipe quality validation
- **scripts/generate-index.js** — Generates searchable recipes.json
- **.github/workflows/validate.yml** — Auto-validates & indexes on push
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
3. Your cookbook will be live at `https://yourusername.github.io/open-recipies/`

### Adding Recipes

**Method 1: Load All Recipes from YAML**
1. Go to https://mgifford.github.io/smart-cookbook/
2. Click the **"📥 Load All Recipes"** button at the top
3. Browser loads all YAML files from `/recipes/` into localStorage
4. Select any recipe from the dropdown

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
4. GitHub Actions automatically validates & indexes your recipe
5. Recipe appears in the searchable browser at [recipes-index.html](recipes-index.html)

## ✅ Quality Assurance

All recipes are **validated and indexed** automatically:

### Validation Checklist
- ✅ Required fields: `meta`, `ingredients`, `steps`, `science_notes`, `history`
- ✅ Valid metadata: name, source, servings (positive number), prep_time
- ✅ Ingredients: each has name, qty_g (numeric), vol_est, function, ww_points
- ✅ Substitutions: each has name, ratio, science_note
- ✅ No duplicate ingredient names
- ✅ Minimum 2 ingredients, 1 step, 1 science note

### Run Locally
```bash
npm run validate:recipes   # Check all recipes for quality
npm run index:recipes      # Generate searchable recipes.json
npm run quality            # Full quality check (all validations)
```

### Automatic CI/CD
Every push to GitHub triggers:
1. **Validation** — Checks all recipe YAMLs
2. **Indexing** — Generates updated `recipes.json`
3. **Auto-commit** — Pushes index changes back
4. **Block merging** — Fails if validation errors found

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

Substitutions show as **green text** with science notes explaining the chemistry.

### Science Mode Explanations
Toggle `scienceMode` to see:
- **Ingredient functions** in gray: `(structure)`, `(fat)`, `(leavening)`
- **Substitution science** in green: "More bran cuts gluten; add 10g water"
- **Cooking Science Panel** with explanations like:
  - "Baking soda reacts with acidic bananas to produce CO₂ gas"
  - "Maillard reaction creates browning and nutty flavors at 175C"

## � Open Culture & Copyright

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

- **TailwindCSS** (CDN) - Dark theme optimized for kitchen use
- **Alpine.js** (CDN) - Reactive state management
- **js-yaml** (CDN) - YAML parsing
- **Pure Client-Side** - No backend, works offline

## 📝 Example Workflow

1. **Find a recipe** on AllRecipes.com
2. **Click bookmarklet** → YAML copied
3. **Paste and Load** → Recipe imported
4. **Toggle Science Mode** → See ingredient chemistry
5. **Enable Vegetarian Mode** → Auto-substitute animal products
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

