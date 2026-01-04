# What's Changed: Whole Units & Display Preferences

## Summary

Your Science Cookbook now has three major improvements for handling ingredients naturally:

### 1. **Whole-Unit Conversions** (conversions.yaml)
Added comprehensive gram-to-whole-unit mappings for:
- **Eggs**: large (57g), medium (50g), small (43g)
- **Fruits**: bananas (118g), apples (182g), oranges, lemons, limes
- **Vegetables**: garlic cloves, onions, tomatoes, potatoes, carrots, peppers, mushrooms, avocados
- **Dairy/Packaged**: butter sticks, cream cheese, bread slices
- **Nuts**: almonds, walnuts (per piece and per tbsp)

### 2. **Smart Bookmarklet Parsing** (script.js)
The bookmarklet now correctly parses ingredient quantities:
- **Before**: `qty_g: 0` for all ingredients ❌
- **After**: 
  - `"2 large eggs"` → `qty_g: 114`
  - `"0.75 cup brown sugar"` → `qty_g: 150`
  - `"1 tsp salt"` → `qty_g: 6`

### 3. **Ingredient Display Preferences** (script.js)
Ingredients now display in their most natural units:

| Ingredient | Stored | Displayed |
|-----------|--------|-----------|
| Salt | 6g | 1 tsp |
| Baking soda | 5g | 1 tsp |
| Honey | 21g | 1 tbsp |
| Lemon juice | 15g | 1 tbsp |
| Vanilla extract | 5g | 1 tsp |

When you scale, they scale intelligently:
- 2× scaling of salt: `6g → 2 tsp` (not `12g`)
- 0.5× scaling of honey: `21g → 0.5 tbsp` (not `10.5g`)

---

## What Changed in Your Data

### conversions.yaml
Added section:
```yaml
whole_units_to_grams:
  eggs:
    large: 57
    medium: 50
  bananas:
    medium: 118
  # ... 40+ more entries
```

Added volume-to-gram quick refs for spices:
```yaml
volume_conversions_g:
  salt_tsp: 6
  baking_soda_tsp: 5
  honey_tbsp: 21
  # ... 15+ more entries
```

### template.yaml
Updated to show examples using whole units:
```yaml
- name: eggs
  qty_g: 228          # Calculated: 4 × 57g
  vol_est: "4 large eggs"  # Human-friendly
```

### script.js
Added three key features:

1. **ingredientDisplayPrefs** — Maps ingredient names to their preferred units
2. **smartEstimateGrams()** — Parses "2 eggs", "1.5 cups flour" → grams
3. **Updated bookmarklet** — Now calls `parseQty()` to convert quantities correctly

### RECIPE-AUTHORING.md
New comprehensive guide for writing recipes with proper whole units.

---

## How to Use

### For Recipe Authors
When writing a recipe, use these guidelines:

```yaml
# ✅ Good - specific, scales correctly
- name: eggs
  qty_g: 228
  vol_est: "4 large eggs"

# ✅ Good - volume units work naturally
- name: flour
  qty_g: 120
  vol_est: "1 cup"

# ✅ Good - salt displays as tsp, not grams
- name: salt
  qty_g: 6
  vol_est: "1 tsp"

# ❌ Avoid - vague, hard to scale
- name: eggs
  qty_g: 228
  vol_est: "some eggs"

# ❌ Avoid - redundant when grams alone work
- name: salt
  qty_g: 6
  vol_est: "6g salt"
```

See **RECIPE-AUTHORING.md** for the complete guide.

### For Users Scraping Recipes
The improved bookmarklet now handles:

**Before:**
```yaml
ingredients:
  - name: 2 large eggs
    qty_g: 0  # ❌ Broken
```

**After:**
```yaml
ingredients:
  - name: 2 large eggs
    qty_g: 114  # ✅ Correctly parsed
```

The bookmarklet uses smart parsing to convert:
- "2 eggs" → 114g
- "1.5 cups flour" → 180g
- "1 tsp salt" → 6g
- "0.5 lb butter" → 227g

### For Developers
Three new helpers in script.js:

1. **`smartEstimateGrams(fullString, ingredientName)`** — Parses ingredient strings to grams
2. **`getDisplayPref(ingredientName)`** — Returns display unit preference (tsp, tbsp, etc.)
3. **Enhanced `formatQuantity()`** — Respects display preferences when showing quantities

---

## Why This Matters

**Before:** Scaling a recipe with salt would show "6g → 12g → 18g" even though cooks think in teaspoons.

**After:** Salt scales naturally: "1 tsp → 2 tsp → 3 tsp" while the math stays precise under the hood.

This makes the app more usable in the kitchen where people think in natural units (eggs, cups, teaspoons) not grams.

---

## Test It Out

Try importing a recipe with this bookmarklet:
1. Visit any recipe website with JSON-LD schema (AllRecipes, Food Network, etc.)
2. Click the bookmarklet
3. Paste the YAML into the import box
4. **qty_g should now be populated correctly** ✅
5. Scale the recipe up/down
6. **Salt, honey, spices should display as tsp/tbsp, not grams** ✅

---

## Files Modified

- `conversions.yaml` — Added whole-unit mapping and display preferences
- `template.yaml` — Updated examples with whole-unit recipes
- `script.js` — Added ingredient display preferences and smart parsing
- `AGENTS.md` — Updated Sous Chef instructions
- **NEW:** `RECIPE-AUTHORING.md` — Complete guide for writing recipes

---

## Next Steps

1. **Try the improved bookmarklet** — Import a recipe from the web
2. **Check the new guide** — Read [RECIPE-AUTHORING.md](RECIPE-AUTHORING.md)
3. **Update existing recipes** — Use whole units in `vol_est` for more natural scaling
4. **Add to display prefs** — If you have a spice or ingredient that should show as tsp/tbsp, add it to `ingredientDisplayPrefs` in script.js

