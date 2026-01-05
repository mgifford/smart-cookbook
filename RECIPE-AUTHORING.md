# Recipe Authoring Guide

## Writing Recipes for the Science Cookbook

This guide helps you write recipes that work beautifully with the cookbook's scaling, substitution, and display systems.

---

## Rule 1: Always Use Grams for `qty_g`, But Keep `vol_est` Human-Friendly

Every ingredient has two quantity fields:

- **`qty_g`** (required): The canonical weight in grams. Used for scaling math.
- **`vol_est`** (required): The human-friendly volume/unit string. Shown in the UI.

### Example: Whole Units (Eggs, Bananas, etc.)

```yaml
- name: eggs
  qty_g: 228        # 4 large eggs × 57g each
  vol_est: "4 large eggs"
  function: structure, moisture, binder
```

- `qty_g: 228` — precise, scales correctly
- `vol_est: "4 large eggs"` — intuitive, tells cooks "go grab 4 eggs"

**Never write:**
```yaml
qty_g: 228
vol_est: "228 g eggs"  # ❌ redundant and ugly
```

---

## Rule 2: Prefer Whole Units When Natural

Use whole units (`vol_est`) for ingredients typically bought or measured that way:

### ✅ Good Examples

| Ingredient | qty_g | vol_est | Why |
|-----------|-------|---------|-----|
| Eggs | 57 | 1 large egg | Eggs are counted, not weighed |
| Bananas | 118 | 1 medium banana | Bananas are counted |
| Butter | 113 | 1 stick (1/4 lb) | Sold in stick packs |
| Salt | 6 | 1 tsp | Cooks measure salt by teaspoon |
| Honey | 21 | 1 tbsp | Honey is measured by spoon |
| Flour | 120 | 1 cup | Flour is measured by cup |

### ❌ Avoid These

| Ingredient | Bad vol_est | Why |
|-----------|------------|-----|
| Eggs | 57g egg | Nobody measures eggs in grams |
| Salt | 6g salt | Cooks think in teaspoonfuls |
| Honey | 21g honey | Volume is more natural |
| Banana | 118g banana | Redundant, unsellable to humans |

---

## Rule 3: Reference `conversions.yaml` for Whole-Unit Weights

Don't guess! Use the [conversions.yaml](conversions.yaml) file for standard weights:

```yaml
whole_units_to_grams:
  eggs:
    large: 57      # ← Use this for "1 large egg"
  bananas:
    medium: 118    # ← Use this for "1 medium banana"
  salt_tsp: 6      # ← Use this for "1 tsp salt"
  honey_tbsp: 21   # ← Use this for "1 tbsp honey"
```

### Common Conversions

**Eggs (large):** 57g each
- 1 egg = 57g → `vol_est: "1 large egg"`
- 2 eggs = 114g → `vol_est: "2 large eggs"`
- 4 eggs = 228g → `vol_est: "4 large eggs"`

**Bananas (medium):** 118g each
- 1 banana = 118g → `vol_est: "1 medium banana"`
- 3 bananas = 354g → `vol_est: "3 medium bananas"`

**Butter (stick):** 113g per stick
- 1 stick = 113g → `vol_est: "1 stick butter"` or `"1 stick (1/4 lb)"`
- 0.5 stick = 57g → `vol_est: "1/2 stick butter"` or `"4 tbsp butter"`

**Flour (all-purpose):** 120g per cup
- 1 cup = 120g → `vol_est: "1 cup flour"`
- 2 cups = 240g → `vol_est: "2 cups flour"`

**Salt:** 6g per teaspoon
- 1 tsp = 6g → `vol_est: "1 tsp salt"`
- 0.5 tsp = 3g → `vol_est: "1/2 tsp salt"`

**Honey/Syrup:** ~21g per tablespoon
- 1 tbsp = 21g → `vol_est: "1 tbsp honey"`
- 2 tbsp = 42g → `vol_est: "2 tbsp honey"`

---

## Rule 4: Use Descriptive Size Modifiers

When `vol_est` includes size, match standard sizes:

✅ **Good:** "1 large egg", "1 medium banana", "1 stick butter"  
✅ **Good:** "1.5 cups flour", "2 tbsp salt" (no size modifier needed for volume)  
❌ **Bad:** "1 egg" (which size?), "2 bananas" (small? large?)

---

## Rule 5: Display Preferences Work Automatically

The app automatically detects certain ingredients and displays them in preferred units:

| Ingredient | Auto-Display | Because |
|-----------|-------------|---------|
| Salt | tsp | Spices are measured by spoon |
| Baking soda | tsp | Leavening agents by spoon |
| Honey | tbsp | Sticky ingredients by spoon |
| Lemon juice | tbsp | Citrus juice by spoon |
| Vanilla extract | tsp | Extracts by spoon |

**Example:**
- You write: `qty_g: 6` (for 1 tsp salt)
- User sees: `1 tsp` (not `6 g`)
- When user scales to 2× servings: `2 tsp` (not `12 g`)

**Add your ingredient to display preferences:**

Edit `script.js` and add to `ingredientDisplayPrefs`:

```javascript
const ingredientDisplayPrefs = {
  'black pepper': { unit: 'tsp', gramsPerUnit: 2 },
  'cinnamon': { unit: 'tsp', gramsPerUnit: 2.6 },
  'soy sauce': { unit: 'tbsp', gramsPerUnit: 18 }
};
```

---

## Rule 6: Use Correct Function Tags

The `function` field explains the ingredient's role in the recipe. Use these tags:

- **structure** — Flour, eggs (builds the matrix)
- **fat** — Butter, oil, nuts (flavor, browning, tenderness)
- **moisture** — Water, milk, applesauce (hydration)
- **leavening** — Baking soda, yeast (rise, lift)
- **flavor** — Spices, salt, vanilla (taste)
- **binder** — Eggs, flour (holds things together)
- **browning** — Sugar, eggs (Maillard reaction)
- **sweetness** — Sugar, honey, fruit (taste)

**Multiple functions are OK:**

```yaml
- name: eggs
  function: structure, moisture, binder, browning
```

---

## Rule 7: Provide Smart Substitutions

For common ingredients, suggest scientifically-informed swaps with `ratio`, `science_note`, and `tags`:

```yaml
- name: butter
  qty_g: 113
  vol_est: "1 stick (1/4 lb)"
  function: fat, browning
  substitutions:
    - name: greek yogurt
      ratio: 0.75
      science_note: Higher moisture; add 10g flour to compensate
      tags: [ww]  # Weight-conscious friendly
    - name: vegan butter
      ratio: 1.0
      science_note: Plant oils replace milk fat; may reduce browning
      tags: [veg, vegetarian]
```

**Key fields:**
- `ratio` — Multiplier for `qty_g`. E.g., `0.75` means use 75% of the original amount.
- `science_note` — Explain how it affects chemistry/texture.
- `tags` — `[ww]` (weight-conscious), `[veg]`, `[vegetarian]`

---

## Rule 8: Add Science Notes to Steps

For each major step, add a brief explanation of the cooking science:

```yaml
steps:
  - Cream butter and sugar until pale (about 3 minutes)
  - Beat in eggs one at a time
  - Fold in flour gently
  
science_notes:
  - "Creaming incorporates air bubbles; sugar crystals cut fat, creating structure"
  - "Eggs emulsify fat and water; add slowly to prevent splitting"
  - "Gentle folding preserves air; overmixing develops gluten (makes cake tough)"
```

---

## Rule 9: Track Recipe History

Use the `history` field to record iterations and improvements:

```yaml
history:
  - date: 2026-01-01
    note: "Initial recipe from AllRecipes"
    change: "Added description of Maillard reaction in step 2"
  - date: 2026-01-04
    note: "User feedback: too dry"
    change: "Increased banana from 2 to 3, added 5g milk"
```

---

## Example: Complete Well-Formed Recipe

```yaml
meta:
  name: Banana Bread
  source: https://example.com/recipe
  base_servings: 1 loaf (12 slices)
  prep_time: 90 min (15 prep, 60 bake, 15 cool)

ingredients:
  - name: eggs
    qty_g: 114
    vol_est: "2 large eggs"
    function: structure, moisture, binder, browning
    ww_points: 0
    substitutions:
      - name: applesauce
        ratio: 0.25
        science_note: Replaces binder & moisture; reduces browning (less fat for Maillard)
        tags: [veg, vegetarian]

  - name: bananas
    qty_g: 354
    vol_est: "3 medium bananas"
    function: moisture, sweetness, binder
    ww_points: 0

  - name: all-purpose flour
    qty_g: 240
    vol_est: "2 cups"
    function: structure
    ww_points: 20
    substitutions:
      - name: whole wheat flour
        ratio: 1.0
        science_note: Higher bran absorbs more water; add 10g milk
        tags: [ww]

  - name: butter
    qty_g: 113
    vol_est: "1 stick (1/4 lb)"
    function: fat, browning
    ww_points: 25
    substitutions:
      - name: greek yogurt
        ratio: 0.75
        science_note: High moisture; add 10g flour
        tags: [ww]

  - name: brown sugar
    qty_g: 150
    vol_est: "3/4 cup"
    function: sweetness, browning, moisture
    ww_points: 15

  - name: baking soda
    qty_g: 5
    vol_est: "1 tsp"
    function: leavening
    ww_points: 0

  - name: salt
    qty_g: 3
    vol_est: "1/2 tsp"
    function: flavor
    ww_points: 0

steps:
  - Preheat oven to 175°C (350°F). Grease a 9×5 loaf pan.
  - Whisk together flour, baking soda, and salt.
  - In a separate bowl, cream butter and brown sugar until pale and fluffy.
  - Beat in eggs one at a time, then mash in bananas.
  - Gently fold dry ingredients into wet mixture until just combined.
  - Pour into prepared pan and smooth top.
  - Bake for 60 minutes until toothpick comes out clean.
  - Cool 10 minutes in pan, then turn out onto wire rack.

science_notes:
  - "Creaming: Sugar crystals cut through butter, incorporating air. This creates fine crumb structure."
  - "Eggs: Added gradually to maintain emulsion between fat and water. Add too fast and they'll break."
  - "Bananas: Mashed overripe bananas provide moisture, natural sweetness, and pectin (binder)."
  - "Baking soda: Reacts with acidic banana to produce CO₂ bubbles → lift. Needs acid to work."
  - "Folding: Gentle mixing preserves air pockets. Overmixing develops gluten (tough crumb)."
  - "Browning: Sugar undergoes Maillard reaction (150–160°C). Dark edges = good flavor."

history:
  - date: 2026-01-01
    note: "Initial version"
    change: "Adapted from AllRecipes basic recipe"
  - date: 2026-01-04
    note: "User testing"
    change: "Increased banana from 2 to 3 for better moisture"
```

---

## Checklist: Before Publishing a Recipe

- [ ] `qty_g` is filled in for every ingredient (not 0)
- [ ] `vol_est` is human-friendly and matches `qty_g` (e.g., "2 large eggs" = 114g)
- [ ] Size modifiers are specific ("1 medium banana" not "1 banana")
- [ ] `function` field lists 2–4 roles (structure, fat, moisture, leavening, flavor, etc.)
- [ ] Substitutions exist for high-impact ingredients (butter, eggs, meat, dairy)
- [ ] Each substitution has `ratio`, `science_note`, and `tags`
- [ ] Science notes explain the cooking chemistry in 1–2 sentences
- [ ] History field is populated with at least one entry
- [ ] Recipe scales correctly (test with 2×, 0.5×, etc.)
- [ ] All temperatures are in both °C and °F

---

## Tips for Great Recipes

1. **Borrow from tested recipes** — AllRecipes, King Arthur, Serious Eats often have reliable ratios.
2. **Weigh your ingredients** — Use the gram amounts from `conversions.yaml`, but verify with a scale.
3. **Test at different scales** — Make sure doubling or halving works.
4. **Explain the "why"** — Science notes turn a recipe into a learning tool.
5. **Be specific about sizes** — "1 large egg" beats "1 egg". "3 medium bananas" beats "2.33 cups mashed banana".
6. **Celebrate open culture** — Add a note: "Adapted from [source]. Please share improvements!"

---

**Need help?** See [AGENTS.md](AGENTS.md#-agent-the-sous-chef-data-cleaner) for The Sous Chef agent, who specializes in converting raw recipes into this format.

