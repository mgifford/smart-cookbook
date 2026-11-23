> **Historical baseline.** This document records the state before modernization work. Some defects listed as open may have been addressed in later commits; see the implementation report and the current code/tests for status. Do not treat this as a live defect list.

# Smart Cookbook Baseline Audit

**Audit date:** 2026-11-23 UTC
**Repository:** `mgifford/smart-cookbook`
**Branch/commit:** `main` at `0ecbce5`
**Environment:** Node.js 22.20.0, npm 11.18.0, Playwright 1.57, headless Chromium 143, `@axe-core/playwright` 4.x, Python 3.14 static server.

This is a point-in-time baseline, not a claim that the application is complete or conformant. It records what exists, what is documented but not implemented, and what was verified before modernization work began.

---

## 1. Method

- Static inspection of HTML, CSS, JavaScript, YAML, tests, and workflows.
- `npm run quality`, plus each quality script separately.
- Playwright journeys against a local static server.
- axe-core scans of `index.html` and `recipes-index.html` with default rules.
- jsdom harnesses calling `cookbookApp()` directly for import/export and unit behaviour.
- Network-throttling/offline simulation by blocking the CDN.
- Performance entries from Chromium (`transferSize`, navigation timing).
- Git history and workflow inspection.

No kitchen testing was performed. No manual assistive-technology testing was performed.

---

## 2. Implemented capabilities

| Area | Baseline status |
|---|---|
| Static hosting | GitHub Pages-compatible; no backend required |
| Recipe data | 11 YAML recipes under `recipes/` |
| Recipe index | `recipes.json` generated from YAML by `scripts/generate-index.js` |
| Recipe browser | Search by name, servings, max time (prep only), science-notes flag |
| Main app | Alpine.js single-page recipe view, scaling, units, nutrition, notes, history |
| Deep links | `?recipe=<id>` now selects the requested recipe (fixed in `0ecbce5`) |
| Scaling | Gram-based scaling with a 32/64 cap; slider allows 200 |
| Unit display | Metric/imperial/precision paths; ingredient densities and display prefs |
| Nutrition | Per-100 g reference data; coverage note reports matched/unmatched ingredients |
| Import/export | YAML and ORF paste/export; zip download; backup JSON |
| Persistence | `localStorage` for prefs and recipes |
| Science | Ingredient functions, per-recipe science notes, optional notes panel |
| Dietary modes | Vegetarian/weight-conscious **suggestions**; quantities are not changed |
| Validation | YAML syntax, recipe field checks, HTML validation, axe and security scans |
| Accessibility | Semantic headings/forms in many places; visible focus on buttons; skip-free single page |
| Documentation | README, AGENTS, RECIPE-AUTHORING, PHILOSOPHY, COPYRIGHT, QUICKSTART, INDEX, testing plan |

---

## 3. Documented but unimplemented or inaccurate

| Claim | Reality |
|---|---|
| “Servings slider (0.25x to 200x)” | Slider is 1–200; JavaScript caps at 32 (64 for names matching a hard-coded “high volume” list). |
| “Works offline” / “offline-first” | All three libraries load from jsDelivr. Blocking the CDN leaves the page inert (no Alpine, no recipe options). No service worker. |
| “Weight-conscious Mode: Swap higher-point ingredients” | Mode shows a suggestion icon/tooltip; it never changes quantities or ingredients. |
| “Vegetarian Mode: Automatically suggest” | Accurate wording, but the README example workflow says “Auto-substitute animal products.” No automatic substitution occurs. |
| “TailwindCSS (CDN)” in README/AGENTS | `index.html` no longer loads Tailwind; a subset of utility classes is hand-written in `styles.css`. `recipes-index.html` previously referenced missing utilities and had broken layout. |
| “Load All Recipes” button | The README describes it, but `load-recipes.js` is not loaded by any HTML page and its `#load-recipes-btn` does not exist. |
| “Complete accessibility conformance” (implied by a passing scan) | The quality gate scans only `index.html`, disables `color-contrast`, and does not test mobile, keyboard, or `recipes-index.html`. |

---

## 4. Verified defects and risks

Status values: **Open**, **Fixed in `0ecbce5`**, or **Partially mitigated**.

### 4.1 Discovery and navigation

| ID | Status | Evidence / impact |
|---|---|---|
| D1 | Fixed | `?recipe=<id>` was ignored. Browser links now select the recipe; verified for `lasagna` and `crispy-mushroom-mac-and-cheese`. |
| D2 | Open | Recipe browser “Max time” uses `prep_time` only and ignores `cook_time`; ISO durations display raw (`PT30M`). |
| D3 | Open | `recipes-index.html` had missing Tailwind utility classes; layout was off-screen at 390 px. Partially mitigated in `0ecbce5` with local utilities, but the page still mixes two class systems. |
| D4 | Open | Search is name-only; no ingredient, technique, equipment, or dietary filters. |

### 4.2 Scaling, units, and time

| ID | Status | Evidence / impact |
|---|---|---|
| S1 | Open | Slider max 200, JS cap 32/64. Setting 200 via state produces 32. README says 0.25x–200x. |
| S2 | Open | Scaling is purely linear. Oven temperature, bake time, pan depth, and practical whole-item counts are not adjusted. |
| S3 | Open | `formatQuantity()` uses hard-coded densities; unknown ingredients fall back to 240 g/cup, which can be materially wrong. |
| S4 | Partially mitigated | Precision mode now returns grams before display preferences; metric regions show grams for solids and ml for liquids. Ingredient-specific density coverage remains incomplete. |
| S5 | Open | ISO 8601 durations are parsed only by `recipes-index.js`’s `parseTime()`; the main app does not model prep/active/passive/rest separately. |
| S6 | Open | Localized decimal formatting (`Intl.NumberFormat`) and fraction output coexist; some outputs are mixed formats. |

### 4.3 Nutrition and substitutions

| ID | Status | Evidence / impact |
|---|---|---|
| N1 | Fixed | Nutrition totals previously omitted unmatched ingredients silently. `nutritionCoverageText()` now reports coverage (14/15 for the mushroom mac) and names unmatched ingredients. |
| N2 | Open | Nutrition reference data is per-100 g and partial; brand/package variation is not modelled. Coverage disclosure is the current mitigation. |
| N3 | Open | Unknown nutrition values are effectively skipped, not treated as zero; the total is labelled approximate but remains a partial sum. |
| N4 | Open | WW points are `null` in the pilot recipe and not calculated anywhere. Documentation correctly warns null is not zero. |
| N5 | Open | Substitutions remain proposals; there is no “apply suggestion” approval flow. Existing UI tooltips are informational only. |
| N6 | Open | Allergen/dietary labels are not modelled; a `veg` tag must not be treated as allergen-safe. |

### 4.4 Data integrity and persistence

| ID | Status | Evidence / impact |
|---|---|---|
| P1 | Open | `loadYaml()` and `fetchRecipeYaml()` reconstruct recipes from known fields only. Top-level `schema_version`, `provenance`, `equipment`, `desired_outcomes`, and `testing_status` are discarded. Verified in jsdom. |
| P2 | Open | `saveYaml()` deletes `id`; `loadYaml()` derives identity from the display name. Renaming or importing a same-named recipe creates a new id or silently shadows an existing one. |
| P3 | Open | No versioned schema or migration layer exists for localStorage or YAML. |
| P4 | Open | Deleting a repository recipe is undone on reload: bootstrap re-adds it from `recipes.json`. Verified with Lasagna. |
| P5 | Open | `downloadAllAsZip()` exports in-memory placeholders. Eleven unopened recipes produced empty YAML files (`ingredients: []`, `_placeholder: true`). |
| P6 | Open | Imported personal recipes can silently shadow repository recipes with the same slug. |
| P7 | Partially mitigated | Missing `substitutions` no longer crashes `displayIngredients()`; guard added in `0ecbce5`. |
| P8 | Open | `selectedId` is not persisted; reload always returns to the sample/first recipe. |
| P9 | Open | `hasUnsavedChanges` is set only on delete; the “Backup All” button is hidden in normal use. |

### 4.5 Import/export and provenance

| ID | Status | Evidence / impact |
|---|---|---|
| I1 | Fixed | `science_notes` were dropped on YAML import; preserved now. |
| I2 | Open | Import does not validate against a schema or report unknown units/quantities before saving. |
| I3 | Open | Bookmarklet has three divergent copies: readable `bookmarklet.js`, its published minified URL, and the in-app `bookmarkletCode`. The two published copies set `qty_g: 0`; README claims gram extraction was added to both. |
| I4 | Open | Bookmarklet-generated YAML interpolates names/steps without quoting; titles containing `:` or `#` can break parsing. |
| I5 | Open | ORF conversion is best-effort and not round-trip tested. |
| I6 | Open | ZIP export includes internal fields (`_placeholder`, `id`, `estimated`) and does not fetch unopened recipes. |
| I7 | Open | No Schema.org Recipe JSON-LD export. |

### 4.6 Accessibility

| ID | Status | Evidence / impact |
|---|---|---|
| A1 | Open | axe on `index.html` with default rules: 6 serious `color-contrast` nodes (primary buttons, white on `#10b981` at 2.54:1; hover at 1.52:1). The project’s `ci-a11y.js` disables this rule. |
| A2 | Open | CI axe scans only the root page, at one desktop viewport, with no keyboard or state coverage. |
| A3 | Open | No manual screen-reader, focus-order, forced-colors, 200% zoom, or touch testing is documented. |
| A4 | Partially mitigated | Mobile reflow at 320/390 px and tooltip overflow fixed in `0ecbce5`; recipe browser received local layout utilities, labels, heading order, and CTA contrast fixes. |
| A5 | Open | Checkbox/range controls are 16 px high; WCAG 2.2 target-size assessment is still required. |
| A6 | Open | Nutrition loading/error and other dynamic states lack a live-region announcement. |
| A7 | Open | Recipe browser source links and card metadata rely on hover-only affordances; tooltip content is duplicated in `aria-label` for one control. |
| A8 | Open | No `prefers-reduced-motion` handling remains in `styles.css`. |

### 4.7 Documentation, dependencies, and governance

| ID | Status | Evidence / impact |
|---|---|---|
| G1 | Open | Root `LICENSE` is AGPL-3.0; `LICENSE.md` and the in-app panel say CC BY-SA 4.0. GitHub surfaces AGPL. Legal decision required. |
| G2 | Open | Three CDN scripts lack SRI, are version-floating (`alpinejs@3.x.x`), and there is no CSP. |
| G3 | Open | `conversions.yaml` is not loaded; `densityPerCup` and `wholeUnitWeights` are duplicated in `script.js` and have drifted (oats 80 vs 90, cocoa 85 vs 90; missing entries). |
| G4 | Open | `load-recipes.js` is orphaned dead code; README still lists it. |
| G5 | Open | No unit/integration tests. `npm test` is not defined. |
| G6 | Open | Generated `recipes.json` is regenerated by the quality script but never checked for staleness; the `validate.yml` workflow auto-commits it on main and attempts a push from PRs. |
| G7 | Open | Workflows use `npm install`, not `npm ci`; Node 18 in one workflow and 20 in another; no fixed Node policy. |
| G8 | Open | README/AGENTS contain stale Tailwind, offline, auto-substitution, and scaling claims. |
| G9 | Open | `docs/` had no baseline, architecture, data-model, or accessibility-testing documents before this audit. |

---

## 5. Existing test coverage

| Layer | Baseline |
|---|---|
| YAML syntax | `npm run validate:yaml` over 16 YAML files |
| Recipe field checks | `npm run validate:recipes`; 11/11 pass, 0 warnings |
| HTML validation | `npm run lint:html`; passes |
| Accessibility | `npm run test:a11y`; one page, desktop only, color contrast disabled |
| Security | `npm run scan:security`; two HTML files, limited checks |
| Generated index | Regenerated by `npm run index:recipes`; no staleness check |
| Unit tests | None |
| Integration/import tests | None |
| Playwright journeys | None beyond the single axe page load |
| Performance budgets | None |
| Offline tests | None |
| Manual accessibility | None documented |
| Kitchen tests | None for the pilot recipe |

**Baseline command result:** `npm run quality` passed (YAML, recipe validation, index generation, HTML lint, axe, security). This is a green pipeline, not proof of reliability or conformance.

---

## 6. Accessibility limitations

- Automated testing is narrow: one page, one viewport, no interactive states, no keyboard path, no `recipes-index.html`.
- `color-contrast` is disabled in `ci-a11y.js`; the underlying failure remains.
- The main page has no live region for nutrition loading, errors, or coverage updates.
- Native `title` tooltips provide nutrition details only on pointer hover; no equivalent visible text or focusable disclosure.
- Checkbox and range inputs are 16 px high; target-size and spacing need manual assessment.
- No documented screen-reader, voice-control, switch-access, forced-colors, text-spacing, or 200% zoom testing.
- The app depends on JavaScript and three CDN scripts; with JavaScript or the CDN unavailable, there is no recipe fallback.
- A passing axe scan must not be represented as WCAG 2.2 AA conformance.

---

## 7. Performance and sustainability baseline

Measured from local Chromium against the Python static server:

| Metric | `index.html` | `recipes-index.html` |
|---|---|---|
| DOMContentLoaded | ~261 ms | ~11 ms |
| Load | ~272 ms | ~12 ms |
| Resources | 9 | 4 |
| Transfer | ~163 KB | ~6.4 KB |
| External requests | 3 (jsDelivr: js-yaml, JSZip, Alpine) | 0 |
| Unpinned/SRI-less scripts | 3 | 0 |

Sustainability concerns:

- Third-party CDN dependency with no local fallback or integrity pinning.
- No service worker or cache strategy; `recipes.json` is fetched with `cache: 'no-store'`.
- Debug `console.log` calls remain on hot rendering paths.
- `nutritionSummary()` now caches by recipe/servings/ingredient key; repeated recomputation was reduced.
- No performance budgets, image optimisation, or regression thresholds.
- Score-based tools (Lighthouse) were not run; no carbon estimate is made.

---

## 8. Data-integrity and migration risks

1. **No version field.** Recipes and localStorage blobs have no migration marker.
2. **Name-derived identity.** Slug collisions can overwrite repository or personal recipes.
3. **Unknown-field loss.** New optional fields survive only if code is changed; current loaders drop them.
4. **Placeholder exports.** ZIP backup can silently produce empty recipe files.
5. **Delete resurrection.** Repository recipes cannot be permanently removed from the library view.
6. **Personal/library shadowing.** Imported recipes persist under the same id and replace the repository record in localStorage.
7. **Generated index drift.** YAML and `recipes.json` can diverge without failing CI.
8. **Localized data.** Saved preferences/recipes are browser-local; clearing storage loses personal data unless exported.

Mitigation direction: versioned schema, stable `id`, preserve unknown fields, explicit migrations, tombstones for deleted library entries, full fetch before ZIP export, and deterministic index checks.

---

## 9. Dependency and security baseline

**Runtime:** Alpine 3.x (floating), js-yaml 4.1.0, JSZip 3.10.1, all from jsDelivr, no SRI/CSP.
**Development:** `@axe-core/playwright`, `@playwright/test`, `html-validate`, `jsdom`, `js-yaml`.

- No server-side secrets or APIs.
- Imported content is rendered through Alpine `x-text` (escaped) rather than raw HTML in most paths.
- `decodeEntities()` uses a detached `<textarea>.innerHTML`; the textarea RCDATA content model limits script execution, but avoiding `innerHTML` is safer.
- `javascript:` bookmarklet URL is user-initiated; no backend.
- Recipe source links use `target=_blank`; `recipes-index.html` now adds `rel="noopener"`, but the security scanner cannot see inside `<template>` content.
- Workflow auto-commit/push from PRs is a supply-chain and branch-protection risk.

---

## 10. Baseline command log

```
npm run validate:yaml     → 16 files pass
npm run validate:recipes  → 11/11 pass, 0 errors, 0 warnings
npm run index:recipes     → 11 recipes generated
npm run lint:html         → pass
npm run test:a11y         → pass (color-contrast disabled; index only)
npm run scan:security     → pass (2 HTML files)
npm run quality           → pass
```

Additional evidence gathered but not part of the existing scripts:

- `?recipe=lasagna` and `?recipe=crispy-mushroom-mac-and-cheese` select correctly.
- YAML export/import preserves `science_notes`, history, status, notes, source, and cook time.
- Top-level unknown fields are lost on import (verified in jsdom).
- Setting servings to 200 results in 32 after `adjustServings()`.
- Deleting Lasagna then reloading restores 12 recipes including Lasagna.
- ZIP export of 12 recipes includes 11 empty placeholder YAML files.
- axe default rules: 6 `color-contrast` violations on `index.html`; 0 on `recipes-index.html`.
- Blocking jsDelivr leaves `window.Alpine` undefined and zero recipe options.

---

## 11. Milestone 1 priority order

1. Add `docs/BASELINE.md` (this document).
2. Add a versioned JSON Schema and schema validation, stable IDs, and duplicate-ID checks.
3. Preserve unknown top-level fields and explicit IDs through import/export; add round-trip tests.
4. Fix the scaling limit and document the exact range.
5. Correct dietary/offline/stack documentation; remove orphaned code.
6. Add deterministic index generation plus a stale-index check; update workflows.
7. Add unit tests for scaling, conversions, import/export, nutrition coverage, and deep links.
8. Expand Playwright/axe coverage to both pages and mobile; remove the colour-contrast exclusion by fixing the buttons.
9. Document accessibility testing and known limitations.
10. Leave Milestones 2–5 (variation comparison, cooking mode, offline/service worker, AI/WebMCP) for follow-up work.

**Fixes already completed in `0ecbce5` before this audit:** deep-link selection, science-note preservation, nutrition coverage disclosure, missing-substitution guard, metric/precision display corrections, mobile reflow, tooltip overflow, recipe-browser layout/labels/heading/CTA contrast. Those are not re-claimed as part of the new milestone.
