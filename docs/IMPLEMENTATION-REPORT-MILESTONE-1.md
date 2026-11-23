# Milestone 1 Implementation Report

**Date:** 2026-11-23
**Repository:** `mgifford/smart-cookbook`
**Report branch:** `docs/milestone-1-report`
**Implementation commits already on main:** `0ecbce5`, `6cb1e29`, `e52bc27`

This is a documentation-only follow-up. The mushroom recipe and modernization implementation are already on `main`; this report records what was completed, what was verified, and what remains. It does not re-claim or duplicate the implementation.

---

## 1. Completed in Milestone 1

### Baseline and architecture
- Added the pre-modernization audit in [BASELINE.md](BASELINE.md), including verified defects, test coverage, accessibility limits, performance measurements, data risks, and migration risks.
- Added [ARCHITECTURE.md](ARCHITECTURE.md), [DATA-MODEL.md](DATA-MODEL.md), [ACCESSIBILITY-TESTING.md](ACCESSIBILITY-TESTING.md), [RECIPE-EXPERIMENTS.md](RECIPE-EXPERIMENTS.md), [AI-GOVERNANCE.md](AI-GOVERNANCE.md), and [LICENSING.md](LICENSING.md).

### Canonical data model and stable identity
- Added [schemas/recipe.schema.json](../schemas/recipe.schema.json).
- Added [scripts/validate-schema.js](../scripts/validate-schema.js) with schema validation, stable-ID/filename checks, duplicate-ID detection, and legacy warnings.
- Added the pilot recipe's `schema_version`, stable `id`, `provenance`, `desired_outcomes`, `equipment`, and `testing_status`.
- Existing recipes were not rewritten. Legacy recipes remain readable and produce migration warnings only.

### Data preservation and reliability
- Import/export preserves unknown top-level fields, explicit IDs, science notes, history, provenance, equipment, and variations.
- Deleted library recipes are remembered with tombstones; re-importing the same ID asks for confirmation and revives it.
- ZIP and JSON backups fetch every placeholder recipe before exporting; internal `_placeholder` flags are stripped and failures are reported.
- Import collisions require explicit confirmation before replacing an existing recipe.
- `saveYaml()` preserves stable IDs.

### Generated data
- Index generation moved to [scripts/lib/recipe-index.js](../scripts/lib/recipe-index.js).
- Added [scripts/check-index.js](../scripts/check-index.js); stale indexes fail with regeneration instructions.
- The generated index is deterministic and no longer contains a timestamp.
- CI no longer auto-commits generated files.

### Tests and continuous quality
- Added 23 `node:test` fixtures under [tests/](../tests/) covering scaling, unit conversion, temperature conversion, import/export, nutrition coverage, deep links, tombstones, export collection, schema, and index synchronization.
- Expanded [scripts/ci-a11y.js](../scripts/ci-a11y.js) to both pages at desktop and 320 px with colour contrast enabled, plus keyboard/deep-link/search journeys.
- Expanded [scripts/ci-security.js](../scripts/ci-security.js) to scan `<template>` content, SRI/crossorigin, insecure resources, static `javascript:` links, and `rel="noopener"`.
- Pinned Alpine 3.17.5 and added SRI to all three CDN libraries.
- Updated CI to Node 22, `npm ci`, Playwright Chromium, one full quality gate, and no auto-commit.

### Accessibility and UX
- Fixed primary/copyright colour contrast; axe now reports zero violations on both tested pages at desktop and 320 px.
- Added nutrition status/coverage live regions.
- Raised checkbox/range targets to 24 px.
- Added `prefers-reduced-motion` handling.
- Added `<noscript>` guidance with a link to the repository recipes.
- Corrected service-worker/offline claims, dietary suggestions wording, and the scaling range (1–64 servings).

---

## 2. Validation evidence

| Check | Result |
|---|---|
| `npm run validate:yaml` | Pass, 17 YAML files |
| `npm run validate:schema` | 11 recipes, 0 errors, 20 legacy warnings |
| `npm run validate:recipes` | 11/11, 0 errors, 0 warnings |
| `npm run check:index` | Synchronized; stale-index failure verified |
| `npm run test:unit` | 23/23 pass |
| `npm run lint:html` | Pass |
| `npm run test:a11y` | 0 axe violations on `index.html` and `recipes-index.html`, desktop and 320 px; journeys pass |
| `npm run scan:security` | Pass on 2 HTML files including template content |
| `npm run quality` | Passed; affected checks rerun after the final collision guard |

Additional browser checks:
- Deep link `index.html?recipe=crispy-mushroom-mac-and-cheese` selects and renders the recipe.
- Scaling at 2, 5, and 8 servings is proportional in precision mode.
- YAML export/import preserves status, notes, source, science notes, history, and structured metadata.
- Deleting Lasagna and reloading does not restore it; re-import revives it after confirmation.
- ZIP export produced 12 populated YAML files with no empty placeholders.
- 320 px and 390 px layouts have no horizontal overflow.

---

## 3. Defects fixed

- `?recipe=` deep link selection (completed in `0ecbce5`, retained).
- YAML import losing `science_notes`.
- Unknown top-level field loss during import/export.
- Name-derived recipe identity and unvalidated/duplicate IDs.
- ZIP/JSON backup exporting empty placeholders.
- Delete resurrection of repository recipes.
- Silent import overwrite of an existing ID.
- Slider/JS scaling mismatch (now 1–64 servings).
- Metric solids rendered as millilitres.
- `°F`/`°C` conversion and missing spacing before “degrees”.
- Unpinned CDN dependencies and missing SRI.
- Axe colour-contrast exclusion and button/heading contrast failures.
- Orphaned `load-recipes.js`.
- CI auto-committing generated files.
- Stale `recipes.json` not failing CI.

---

## 4. Known limitations and remaining milestones

- **Milestone 2:** comparison UI between source and adaptation, personal experiment storage/export, variation promotion policy. Only structured provenance/equipment and a blank experiment template exist.
- **Milestone 3:** cooking mode, light/system theme support, broader accessibility preferences.
- **Milestone 4:** service worker/offline verification, self-hosted libraries, CSP, performance budgets, sustainability reporting.
- **Milestone 5:** optional AI proposal workflow and WebMCP — intentionally not started.
- **Licensing:** root `LICENSE` is AGPL-3.0 while `LICENSE.md` says CC BY-SA 4.0; see [LICENSING.md](LICENSING.md). Owner decision required.
- **Runtime duplication:** `conversions.yaml` still duplicates tables in `script.js`; bookmarklet implementations remain divergent.
- **Manual checks:** no human screen-reader, 200% zoom, forced-colours, touch, or real kitchen test has been performed.
- **Remote CI:** GitHub Actions was not observed running after the push; local checks passed.

---

## 5. Reviewer checklist

1. Confirm the schema and stable-ID behavior match [DATA-MODEL.md](DATA-MODEL.md).
2. Run `npm ci`, `npx playwright install chromium`, and `npm run quality`.
3. Try `index.html?recipe=crispy-mushroom-mac-and-cheese` at desktop and 320 px.
4. Import a YAML recipe containing extra top-level fields; export and re-import it.
5. Delete a library recipe, reload, and confirm it stays deleted.
6. Export all recipes and confirm no YAML file has an empty ingredient list.
7. Review the residual limitations above before treating Milestone 1 as complete in a release sense.

A passing automated scan is not proof of WCAG conformance. An untested recipe is not a kitchen-tested recipe. A nutrition total with missing reference data remains incomplete.
