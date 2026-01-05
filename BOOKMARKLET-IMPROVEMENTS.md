# Bookmarklet Improvements: Automatic Weight Extraction

## Problem Solved

Previously, when you scraped recipes using the bookmarklet, all ingredients had `qty_g: 0` because weight values embedded in ingredient names weren't extracted. For example:

```yaml
- name: "4 pounds/1.8 kilograms beef marrow bones, cut into 3-inch long pieces"
  qty_g: 0  # ❌ Lost the 1800g value
  vol_est: "4 pounds/1.8 kilograms beef marrow bones, cut into 3-inch long pieces"
```

## Solution Implemented

Added `extractGramsFromName()` function to both [bookmarklet.js](bookmarklet.js) and [script.js](script.js) that:

1. **Extracts explicit gram/kilogram values** from ingredient names
2. **Converts imperial weights** (pounds, ounces) to grams
3. **Estimates volume-based quantities** (tablespoons, teaspoons, cups)
4. **Handles complex formats** like "4 pounds/1.8 kilograms" (extracts the latter)

## Extraction Patterns Supported

| Pattern | Example | Result |
|---------|---------|--------|
| Kilograms | `1.8 kilograms` | 1800g |
| Grams | `200 grams` | 200g |
| Pounds | `4 pounds` | 1814g |
| Ounces | `5 ounces` | 142g |
| Tablespoons | `8 tablespoons` | 120g |
| Teaspoons | `1 teaspoon` | 5g |
| Cups | `1 cup` | 240g |

## Test Results: Beef Pho Recipe

Running the extraction on your Beef Pho ingredients:

```
1800g → 4 pounds/1.8 kilograms beef marrow bones, cut into 3-inch long pieces
1300g → 3 pounds/1.3 kilograms boneless brisket, cut into thirds
 450g → 1 pound/450 grams oxtail
 120g → 8 tablespoons fine sea salt
 450g → 1 pound/450 grams daikon, peeled
 200g → 200 grams yellow rock sugar
  30g → 2 tablespoons fish sauce
   0g → 1 bunch cilantro, leaves picked          (needs Sous Chef annotation)
  10g → 10 pods/10 grams star anise
   0g → 1 thick 3-inch cinnamon stick           (needs Sous Chef annotation)
```

**Results:** 8 out of 10 ingredients now have accurate `qty_g` values extracted automatically. Items without weight references (like "1 bunch cilantro") remain `0g` and require the Sous Chef to add `wholeUnitWeights` or density estimates.

## How It Works

### Bookmarklet Flow
1. Scrapes recipe from JSON-LD on webpage
2. For each ingredient, calls `extractGramsFromName(normalized_name)`
3. Populates `qty_g` field with extracted weight (no longer hardcoded to `0`)
4. User copies YAML to clipboard and imports into app

### Script.js Export
The `extractGramsFromName()` function is also available in [script.js](script.js) for:
- Testing / debugging extracted weights
- Future recipe processing pipeline enhancements
- Batch import utilities

## Remaining Manual Work

After extraction, the Sous Chef still needs to:

1. **Add cooking notes & substitutions** (e.g., why beef marrow bones → beef short ribs)
2. **Annotate ingredient functions** (structure, moisture, flavor, fat, leavening)
3. **Add Weight Watchers points** (for tracking recipes)
4. **Complete whole-unit estimates** for items like "1 bunch cilantro" via:
   - Adding to `wholeUnitWeights` dictionary in [script.js](script.js)
   - Or noting in `vol_est` for human reference (e.g., "1 bunch cilantro ≈ 25g")

## Benefits

✅ **Faster recipe onboarding** — No more manual gram conversion for every ingredient  
✅ **Fewer data-entry errors** — Automatic extraction is less error-prone than typing  
✅ **Scalable workflows** — Works for any recipe scraped from JSON-LD  
✅ **Backward compatible** — Doesn't change behavior for existing recipes  

## Files Modified

- [bookmarklet.js](bookmarklet.js) — Added `extractGramsFromName()` and wired into ingredient creation
- [script.js](script.js) — Added `extractGramsFromIngredientName()` for export/testing

---

**Next Steps:** Use the bookmarklet on future recipes. After scraping, the Sous Chef (or [The Debugger](AGENTS.md)) can complete missing annotations.
