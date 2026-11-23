# Implementation Report: Reliability (1.1) and Experiments (1.2)

**Base inspected:** `main` at `e6fdba7`
**Date:** 2026-11-23
**Working branch:** `feature/reliability-1-1` (not merged at the time of writing)

This report describes implemented behaviour and verified results. It does not claim kitchen validation, WCAG conformance, or a complete backup when records are missing.

---

## 1. Summary

Release 1.1 focused on data integrity:

- One shared browser/Node recipe validator derived from the canonical schema.
- Visible, field-level import errors and warnings; invalid imports are not saved.
- Repeated ingredient names are preserved.
- Unknown, estimated, zero, and missing quantities are distinguishable.
- `null` WW values remain null; explicit zero remains zero.
- Backups produce a complete/partial manifest; partial exports require explicit confirmation.
- Nutrition is labelled as a known-ingredient subtotal when coverage is incomplete, with missing quantities and missing reference data separated.
- `conversions.yaml` is now the authored source for generated browser conversion data.
- Recipe selection and URL state persist without a routing framework.
- The bookmarklet no longer emits false zero quantities or WW points.

Follow-up added: focused static recipe pages and dietary clarity:

- Every recipe has a text-focused static page at `recipes/<id>.html`; the app/bookmarklet tools are not on it.
- Static pages include ingredients, directions, optional science notes, cook's notes, dietary guidance, and basic social metadata.
- Vegetarian and Vegan are separate categories. Vegetarian allows dairy/eggs; vegan excludes all animal-derived ingredients.
- The interactive suggestion selector uses `vegan`/`vegetarian`/`veg` tags; vegan mode never falls back to a dairy-only suggestion.
- Generated pages are checked for staleness and included in axe/320 px tests.
- Cooking Science and Nutrition share a responsive two-column row; nutrition displays rounded approximations rather than decimal lab-style precision.

Follow-up added: shareable routes and anchors:

- The root URL is a home/library page; `?recipe=<id>` opens one recipe.
- `#ingredients`, `#steps`, `#science`, `#nutrition`, `#experiments`, and `#notes` are stable section anchors, with a table of contents and visible permalinks.
- “Share recipe” uses the Web Share API or clipboard and includes the current section hash.
- Closed notes disclosures and hidden science sections are revealed before a deep link moves focus.
- Bookmarklet, YAML import/export, display settings, and copyright context moved to the home page only.
- A skip link and visible focus targets were added.

Release 1.2 added:

- Structured recipe facts (provenance, equipment, testing status, desired outcomes).
- A local cooking-experiment form with null-defaulted ratings.
- Local save/edit/delete, JSON export/import, and reload persistence.
- A semantic comparison table for two experiments, including flat versus ridged cast iron.
- Playwright and axe coverage for the form, saved records, comparison table, and import-error state.

---

## 2. Defects confirmed and fixed

| Defect | Resolution |
|---|---|
| Browser imports used weaker validation than repository YAML | Shared `src/recipes/validation.js` reads the generated canonical schema; Node also applies its semantic checks |
| Duplicate ingredient names were silently deleted on import | Name-based deduplication removed; entries and order preserved |
| Unknown quantities were estimated or written as zero | `qty_g: null` means unknown; estimates require `estimated: true` and `quantity_source`; explicit zero remains zero |
| `ww_points: null` became zero | Null preserved in YAML, ORF, substitutions, and display paths |
| Missing/invalid quantities were coerced | Invalid explicit IDs and non-numeric quantities now produce visible errors and are not saved |
| Partial backups could look complete | `collectFullRecipes()` reports expected/exported/missing; JSON and ZIP include a manifest; partial export requires confirmation |
| Nutrition totals looked complete with missing data | Headings switch to “Known-ingredient subtotal”; coverage separates missing quantities from missing reference data |
| Conversion data existed twice | `conversions.yaml` is authoritative; `src/generated/conversions.js` is checked for staleness; runtime tables removed |
| Selected recipe reset on reload | Stored selection with URL > stored > default precedence; tombstoned recipes never win |
| URL did not reflect selection | `replaceState` on load and `pushState` on explicit selection; popstate reloads the URL recipe |
| Bookmarklet wrote zero for unknown quantity/WW | Single source generates safe quoted YAML, preserves unknown quantities as `null`, and supports `@graph`/structured instructions |
| Experiment template was only a file | Browser form, local storage, edit/delete, JSON export/import, and comparison table implemented |
| No structured recipe facts in the UI | Provenance, preferred equipment, testing status, and desired outcomes shown |
| Repository and browser validation diverged | Shared validator tested against valid, invalid, legacy, duplicate, null/zero, and unsupported-version fixtures |

---

## 3. Behaviour changes

- Import errors are displayed in an `role="alert"` panel with field paths; focus moves to the summary. The pasted text is preserved.
- Imports with fewer than two ingredients, no steps, no science notes, invalid metadata, malformed substitutions, or invalid quantities are rejected.
- Unknown quantities appear with a “quantity unknown” marker; estimated quantities show “estimated”.
- Nutrition headings are conditional: “Known-ingredient subtotal” when any ingredient is excluded.
- Deletion uses tombstones; an explicit re-import clears the tombstone after confirmation.
- `recipes.json` is deterministic and has no timestamp.
- Generated conversion/schema files are checked in CI; stale generated files fail the quality gate.
- The camera/experiment form never writes to authored recipe YAML and never marks a recipe tested automatically.

---

## 4. Data migrations

- Existing recipes without `schema_version`/`id` remain valid legacy records; warnings only.
- Existing `qty_g` numbers are preserved. Nullable quantities are additive.
- Existing WW values, including 0, are preserved. Missing values become null in browser imports.
- Existing localStorage recipe/preference data is unchanged.
- New keys: `cookbook-selected-recipe`, `cookbook-experiments`.
- Existing tombstones remain compatible.
- No existing recipe was rewritten by automation.

---

## 5. Tests and results

| Command | Result |
|---|---|
| `npm run validate:yaml` | Pass, 17 YAML files |
| `npm run validate:schema` | 11 recipes, 0 errors, 20 legacy warnings |
| `npm run check:schema-module` | Synchronized |
| `npm run validate:recipes` | 11/11, 0 errors, 0 warnings |
| `npm run check:index` | Synchronized |
| `npm run check:conversions` | Synchronized |
| `npm run check:ci-policy` | Pass |
| `npm run test:unit` | 85/85 pass |
| `npm run lint:html` | Pass |
| `npm run test:a11y` | 0 axe violations across both pages, desktop/320, experiment form, comparison table, and import-error state; journeys pass |
| `npm run scan:security` | Pass, including template content and SRI |
| `npm run quality` | Pass |

Additional manual browser checks:
- Deep link, selected-recipe persistence, and URL update.
- Duplicate butter entries and unknown-quantity import with visible warning/badge.
- Full and partial ZIP exports; partial manifest correctly reported one missing recipe.
- Experiment save/reload, export, import, and comparison.
- 320 px reflow with the form and comparison table open.

**Not run:** a real kitchen cook, manual screen-reader/zoom/forced-colours testing, remote GitHub Actions, and the deployed Pages site after merge.

---

## 6. Remaining issues and limitations

1. **Bookmarklet source** is consolidated into `src/bookmarklet/recipe-scraper.js`; `bookmarklet.js` is generated and checked. `@graph`, structured instructions, colons, quotes, unicode fractions, and unknown quantities are tested. The scraper intentionally leaves science notes for human completion.
2. **Source-versus-adaptation comparison** is not implemented because the repository does not hold the cookbook’s original quantities. The UI compares recorded experiments instead of fabricating source data.
3. **No automatic promotion** from an experiment to `tested`/`reviewed`; this is deliberate.
4. **No IndexedDB migration**, cloud sync, accounts, photos, or attachments.
5. **No offline/service-worker implementation**; the app still depends on pinned CDN libraries.
6. **No manual assistive-technology evidence**; automated axe is not conformance.
7. **Legacy recipes** still lack explicit `schema_version`/`id` (20 warnings); migration is gradual.
8. **Licence conflict** (AGPL-3.0 root `LICENSE` vs CC BY-SA 4.0 `LICENSE.md`) remains an owner decision.

---

## 7. Recommended next step

Complete manual accessibility testing of the experiment form and comparison table. Decide whether a source-recipe record can be added without reproducing the cookbook’s expressive text; until then the comparison remains experiment-based. Verify the generated bookmarklet in Firefox and Safari in addition to Chromium.
