# Accessibility Testing

**Baseline:** WCAG 2.2 AA is the project target. A passing automated scan is **not** a claim of conformance.

Smart Cookbook is a static, client-side app. The important accessibility questions are therefore about keyboard operation, reading order, dynamic state, mobile use in a kitchen, and persistence across reloads — not only static markup.

---

## 1. Automated coverage

Run:

```bash
npm run test:a11y
```

The check is `scripts/ci-a11y.js`. It starts a local static server when pointed at the default `http://127.0.0.1:4173`, then uses Playwright Chromium and axe-core.

### Journeys covered

| Journey | Assertion |
|---|---|
| Direct recipe link | `index.html?recipe=crispy-mushroom-mac-and-cheese` selects the recipe |
| Recipe rendering | Title, at least 15 ingredient items, at least 13 steps, and the notes panel render |
| Keyboard scaling | Focusing the servings slider and pressing ArrowRight changes the value |
| Reflow | `index.html` does not overflow horizontally at 320 CSS px |
| Recipe browser | At least 11 cards render |
| Search | Typing `Crispy` filters the browser to one card |
| Deep link from a card | The card points at `index.html?recipe=crispy-mushroom-mac-and-cheese` |
| Recipe-browser reflow | No horizontal overflow at 320 CSS px |
| Home / recipe split | Home shows the library and technical tools; recipe view hides technical tools and shows the recipe plus anchors |
| Share link | “Share recipe” copies a section-specific `?recipe=…#section` URL |
| Anchor navigation | TOC/permalink links update the hash, move focus, and open the closed notes disclosure when deep-linked |
| Skip link | The skip link is visible on focus and targets `#main-content` |
| Experiment form | The form opens, saves a record, and the record persists after reload |
| Invalid import | An invalid YAML import shows a visible error summary and focuses it |
| Runtime errors | No page errors or console errors during the journeys |

### axe coverage

axe is run at:

- `index.html` home, desktop (1280 × 900)
- `index.html` home, 320 × 844
- `index.html?recipe=crispy-mushroom-mac-and-cheese#ingredients`, desktop
- the recipe view at 320 × 844
- the experiment form open
- the experiment comparison table
- the home page with an invalid-import error summary
- `recipes-index.html`, desktop
- `recipes-index.html`, 320 × 844

Tags: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`.

The `color-contrast` rule is **not disabled**. The button and copyright-heading colours were changed so the current pages pass it. If a rule is excluded in future, document the rule, its scope, the reason, and the manual test that replaces it.

### What automation does not establish

- Correct screen-reader reading order or pronunciation.
- That focus is always visible and never trapped.
- That dynamic status messages are announced.
- That zoom, text spacing, forced colours, or reduced motion work.
- That touch targets are usable in a real kitchen.
- That imported personal recipe content remains accessible.

---

## 2. Manual test requirements

### Screen reader

Test at least one desktop and one mobile screen reader (for example NVDA + Firefox/Chrome, VoiceOver + Safari, or TalkBack + Chrome):

1. Load a direct recipe URL. Confirm the title, source, status, and servings are announced in a useful order.
2. Navigate headings and lists. Confirm ingredients and ordered steps have sensible structure.
3. Open the “Adaptation notes, equipment & testing status” disclosure and read its content.
4. Change servings with the keyboard and confirm the quantity updates are discoverable.
5. Read the nutrition coverage note and confirm it is not mistaken for a complete calculation.
6. Search the recipe browser, filter results, and follow a recipe link.
7. Check that nutrition loading, error, and coverage updates are announced.

### Keyboard only

- Tab through the header, recipe selector, delete/backup, servings slider, dietary toggles, recipe actions, notes disclosure, ingredient suggestions, YAML controls, and display preferences.
- Confirm no focus trap, no invisible focused control, and a logical order.
- Confirm no action requires a pointer.
- Confirm the slider can be changed with arrows/Home/End and the checkbox toggles with Space.

### Focus visibility and state

- Check focus on buttons, links, selects, the range input, checkboxes, the notes disclosure, and suggestion buttons.
- The notes disclosure uses a custom `:focus-visible` outline; browser defaults remain for other controls.
- Confirm focus does not disappear when the tooltip opens.

### Zoom, text, and reflow

- 200% browser zoom at 1280 × 900; no clipped controls or horizontal scrolling for primary content.
- 400% text-only zoom where supported.
- 320 CSS px reflow (covered automatically) plus 390 px mobile.
- Text-spacing overrides (letter/word/line/paragraph spacing) should not clip content.

### Forced colours and reduced motion

- Windows High Contrast / forced-colours mode: borders and focus indicators remain visible.
- `prefers-reduced-motion: reduce`: the backup-button pulse and any other animation should stop. A CSS override is present; verify it in a real browser/OS setting.
- No information is conveyed by colour alone.

### Touch and kitchen use

- Target-size assessment at 320–430 px. Checkboxes and the range input are now 24 px high. Verify spacing and touch usability on a real phone; the wrapping label also enlarges the checkbox target.
- Suggestion icons are small; verify they are reachable and readable on a phone, including with wet or floury hands.
- Tooltips must not be the only route to essential information. Suggestion text is duplicated in the button’s accessible name; nutrition uses `title`, which is a known limitation.

### Persistence and recovery

- Reload after changing servings, prefs, and selected recipe. Preferences persist; selected recipe currently resets.
- Delete a library recipe; reload; confirm it does not return (tombstone behavior).
- Re-import a deleted id and confirm it revives.
- Export YAML/ZIP and confirm no user data is silently lost.

---

## 3. Known limitations

| Limitation | Status |
|---|---|
| Dark-only theme; no light/system theme selector | Not implemented (Milestone 3) |
| No cooking mode | Not implemented (Milestone 3) |
| Live regions for nutrition/form/import status | Added; verify announcements with a real screen reader |
| Experiment form and comparison table | Automated axe/Playwright coverage added; manual screen-reader and zoom testing still required |
| Source-versus-adaptation comparison | Not implemented; no source quantities are fabricated |
| Nutrition details use `title` (hover-only) | Open |
| Checkbox/range target height | Raised to 24 px; verify touch spacing in a real browser |
| `prefers-reduced-motion` override | Added; still needs a real OS-level check |
| No manual screen-reader transcript in the repo | Open |
| No 200% zoom automated assertion | Manual only |
| No forced-colours automated assertion | Manual only |
| CDN/JavaScript required for any recipe content | Open (Milestone 4) |
| No service worker or offline status UI | Not implemented (Milestone 4) |

---

## 4. Reproducing a problem

```bash
npm ci
npx playwright install chromium
npm run test:a11y
```

To inspect manually:

```bash
python3 -m http.server 8010
# http://127.0.0.1:8010/index.html?recipe=crispy-mushroom-mac-and-cheese
# http://127.0.0.1:8010/recipes-index.html
```

When filing an accessibility issue, include:

- URL and viewport/zoom.
- Browser and assistive technology/version.
- Keyboard or pointer steps.
- What was announced or focused.
- Expected vs actual.
- Whether the issue reproduces with `?debug=true`.
- A screenshot only when it adds information that text cannot.

Do not describe a passing axe run as “WCAG 2.2 AA compliant.” Describe it as “the automated axe checks passed under the stated scope.”
