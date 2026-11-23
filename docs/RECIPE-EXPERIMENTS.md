# Recipe Experiments

Cooking observations are evidence about one preparation under specific conditions. They are not proof that the same result will happen every time, and they do not automatically promote an untested recipe to a tested or reviewed state.

---

## Status vocabulary

| Status | Meaning |
|---|---|
| `proposed` | An authored adaptation or hypothesis, not cooked by this project |
| `untested` | A recipe or variation that has not been cooked |
| `tested` | A human recorded an actual attempt with observations |
| `reviewed` | A tested variation whose result was evaluated and, if appropriate, incorporated |

A saved experiment is a record, not an automatic promotion. The mushroom mac and cheese recipe remains `proposed` / `untested` until a human evaluates a real cook and updates the authored YAML deliberately.

---

## What is implemented

- The recipe view has a **Cooking experiments** form.
- Recorded fields include recipe ID, variation label, recipe revision hash, date, pan type/size/surface, stovetop pre-sear, oven temperature, baking duration, broiler use, ingredient changes, seven 1–5 observations, elapsed time, approximate cost, and notes.
- Unanswered ratings are stored as `null`; they are never prefilled with invented values.
- Records are saved in `localStorage` under `cookbook-experiments` and stay local until the user exports them.
- Records can be edited, deleted with confirmation, exported as JSON, and imported as untrusted JSON with duplicate confirmation.
- Two records can be compared in a semantic HTML table. This supports the flat-versus-ridged cast-iron question with actual observations rather than assumptions.
- The recipe revision is a stable content hash recorded at save time so a later recipe edit is visible in the experiment history.

---

## Record schema

```yaml
id: exp-example
recipe_id: crispy-mushroom-mac-and-cheese
variation_id: weeknight
recipe_revision: "a1b2c3d4"
date: "2026-11-23"
equipment:
  pan_type: flat_cast_iron   # flat_cast_iron | ridged_cast_iron | metal_baking_pan | other
  pan_size_inches: 12
  surface: flat
  stovetop_pre_sear: true
  oven_temperature_c: 210
  baking_minutes: 24
  broiler_used: false
ingredient_changes: "Used 2% milk; omitted soy sauce."
observations:
  top_crispness: null
  bottom_crispness: null
  mushroom_intensity: null
  creaminess: null
  sticking: null
  cleaning_difficulty: null
  ease_of_serving: null
actual_elapsed_minutes: null
cost_cad: null
notes: ""
created_at: "2026-11-23T12:00:00.000Z"
updated_at: "2026-11-23T12:00:00.000Z"
```

`null` means **not observed**. Do not replace it with a plausible rating.

---

## Using the form

1. Open a recipe.
2. Open **Cooking experiments** and choose **Record or edit an experiment**.
3. Fill in only what you observed. Leave unknown ratings blank.
4. Save. The status line reports that the record was saved locally.
5. Reload and confirm it remains listed.
6. To compare, save at least two records and use the comparison table.
7. Use **Export experiment JSON** before clearing browser data or moving to another device.
8. Import is explicit and treats JSON as untrusted data; existing IDs require confirmation before replacement.

The profile is not published. Do not put personal or sensitive information in free-text notes if the JSON may be shared.

---

## What remains unimplemented

- Publishing experiments to the repository or a public library.
- Promoting a variation from `tested` to `reviewed` through a reviewed workflow.
- Source-recipe-versus-adaptation comparison where the source quantities are unavailable in the repository. The interface does not fabricate those values.
- IndexedDB migration; localStorage is sufficient for the current record sizes.
- Cloud sync, accounts, or cross-device storage.
- Photos or attachments.
- Any AI-generated observation or automatic substitution approval.

Those are later milestones. Do not treat a local experiment as a universal cooking recommendation.
