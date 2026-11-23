# Architecture

**Status:** current implementation plus planned refactoring boundaries. This document describes what exists, not aspirational features.

---

## 1. Runtime shape

Smart Cookbook is a static GitHub Pages application:

```text
index.html ──> styles.css
     └──────> Alpine.js (CDN) + js-yaml (CDN) + JSZip (CDN)
     └──────> script.js (one Alpine component, cookbookApp)
                    │
                    ├── recipes.json (generated index)
                    ├── recipes/<id>.yaml (on demand)
                    ├── nutrition.yaml
                    ├── ingredients-glossary.yaml
                    └── meat-substitutions.yaml

recipes-index.html ──> recipes-index.js + recipes.json
scripts/*.js ──> CI/local validation, indexing, Playwright/axe
```

There is no backend, account, database, or server-side rendering. User data stays in `localStorage` except for static asset requests and the three CDN libraries.

---

## 2. Data flow

1. `script.js` reads `?recipe=` and `?debug=`, loads stored recipes/prefs, and selects a recipe.
2. `bootstrapRecipes()` fetches `recipes.json`, adds placeholders for index entries not already stored (respecting deletion tombstones), and loads the selected recipe YAML.
3. `displayIngredients()` scales quantities, resolves substitutions as suggestions, computes nutrition, and returns display objects.
4. `nutritionSummary()` caches by recipe/servings/ingredient key and reports coverage.
5. Preferences drive unit and temperature display without mutating authored YAML.
6. Export uses YAML/JSON/zip; import normalizes while preserving unknown fields and stable ids.

---

## 3. Sources of truth

| Data | Owner |
|---|---|
| Recipe content | `recipes/*.yaml` |
| Browser index | generated `recipes.json` |
| Nutrition reference | `nutrition.yaml` |
| Ingredient synonyms | `ingredients-glossary.yaml` |
| Unit/density reference | `conversions.yaml` (documentation) and `script.js` runtime tables (current duplication) |
| Validation contract | `schemas/recipe.schema.json` + `scripts/validate-recipes.js` |
| Personal state | `localStorage` |

`conversions.yaml` is not yet loaded at runtime; this is a known duplication/drift risk. Moving the runtime tables into one generated module is a follow-up refactor.

---

## 4. Validation and quality

- `npm run validate:yaml` — syntax across all YAML.
- `npm run validate:schema` — JSON Schema, stable IDs, duplicate IDs.
- `npm run validate:recipes` — project-specific field/quality checks.
- `npm run check:index` — deterministic index comparison; fails with regeneration instructions.
- `npm run test:unit` — Node fixtures for scaling, units, import/export, nutrition coverage, deep links, tombstones, exports.
- `npm run lint:html` — HTML validation.
- `npm run test:a11y` — Playwright journeys and axe at desktop/320 px on both pages, colour contrast enabled.
- `npm run scan:security` — limited static HTML checks.
- `npm run quality` — the combined gate.

Passing checks are evidence, not proof of correctness, accessibility conformance, or culinary outcomes.

---

## 5. Accessibility and progressive enhancement

- Semantic HTML, native controls, and a single-page layout.
- Visible focus styles on buttons and the notes disclosure.
- 320 px reflow and tooltip overflow were fixed in `0ecbce5`.
- The app currently requires JavaScript and pinned CDN libraries. A `<noscript>` notice points to the repository YAML, but there is no service worker and no offline fallback.
- External scripts and styles require SRI in the security scan; a Content Security Policy is still missing.
- Automated axe coverage is intentionally broader now, but manual screen-reader, zoom, forced-colours, and touch testing remain required. See [ACCESSIBILITY-TESTING.md](ACCESSIBILITY-TESTING.md).

---

## 6. Known architectural limits

1. `script.js` is still a large Alpine closure; pure calculations are not yet extracted into `src/` modules. Tests exercise them through a jsdom harness.
2. Runtime conversion tables duplicate `conversions.yaml`.
3. The bookmarklet exists in three divergent copies.
4. There is no storage schema version or migration framework.
5. There is no personal-experiment store or variation comparison UI.
6. Offline support is not implemented.

These are deliberate follow-up milestones. Do not introduce a frontend framework to solve them; small CommonJS/ES modules and node tests are sufficient.

---

## 7. Planned module boundaries (not yet implemented)

If `script.js` is refactored, keep the responsibilities narrow:

```text
src/recipes/{loader,normalizer,scaling,conversions,substitutions}.js
src/nutrition/calculator.js
src/storage/{preferences,personal-recipes,migrations,export}.js
src/evidence/experiments.js
```

Do not create empty modules. Move code only when tests can cover the move and existing recipes remain unchanged.
