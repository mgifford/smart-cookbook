# Recipe Experiments

This is a lightweight evidence model for cooking observations. It does not publish personal observations by itself, and it does not turn a proposed adaptation into a tested recipe.

---

## Status vocabulary

| Status | Meaning |
|---|---|
| `proposed` | An authored adaptation or hypothesis, not cooked by this project |
| `untested` | A recipe or variation that has not been cooked |
| `tested` | A human recorded an actual attempt with observations |
| `reviewed` | A tested variation whose result was evaluated and, if appropriate, incorporated |

Do not promote a variation automatically. A single cook is one observation, not a reliable result.

The pilot recipe is `proposed` / `untested`. The prose recipe notes and testing plan repeat that status. The UI displays a status badge.

---

## Experiment template

Use [experiments/crispy-mushroom-mac-and-cheese/experiment-template.yaml](../experiments/crispy-mushroom-mac-and-cheese/experiment-template.yaml).

Rules:

1. `null` means **not observed**. Never replace it with a plausible rating.
2. Record the pan type, pan size, seasoning state, oven temperature, and whether the stovetop step was used.
3. Record the bread timing and whether the broiler was used.
4. Record sticking and cleaning difficulty, not only crispness.
5. Record cost categories separately (consumed, checkout, pantry, optional).
6. Add a `history` entry to the recipe only after a real cook.
7. Do not publish personal observations without an explicit user action. Personal experiment storage/export is not implemented yet.

---

## What remains unimplemented

- A personal experiment store in the browser.
- Import/export of personal experiments.
- A variation comparison interface driven by actual records.
- Automatic promotion from `tested` to `reviewed`.
- Any AI-generated proposal or approval workflow.

Those belong to later milestones. The current template is intentionally a file-based starting point, not a full experiment system.

---

## Distinctions that must survive

- An untested prediction is not a tested result.
- A crisp-bottom technique is not a guarantee.
- A calculated nutrition total with missing ingredients is not complete.
- A passed automated accessibility scan is not WCAG conformance.
- A proposed adaptation is not identical to its inspiration.
