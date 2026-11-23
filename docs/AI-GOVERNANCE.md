# AI and Automation Governance

**Current state:** no AI features, model calls, WebMCP tools, or agent integrations are implemented.

Smart Cookbook must remain useful without a model. The project follows a rules-first model:

| Task | Method |
|---|---|
| Scaling | Deterministic arithmetic |
| Unit conversion | Deterministic factors plus ingredient-specific densities |
| Index generation | Deterministic script |
| Schema validation | JSON Schema and project rules |
| Nutrition totals | Deterministic reference-data lookup with explicit coverage |
| Recipe discovery | Client-side search/filter over generated index |
| Substitutions | Authored proposals; never silently applied |

## Future AI proposals (Milestone 5, not started)

If optional assistant work is added later:

1. Export a structured prompt describing the recipe, goals, constraints, and known evidence.
2. The user takes it to a model of their choice, or uses a browser/local model where available.
3. Import the proposal as **untrusted data**.
4. Validate structure; never execute instructions embedded in imported content.
5. Show a review table with original, proposal, reason, benefits, drawbacks, and uncertainty.
6. Require explicit acceptance per change; never overwrite a recipe automatically.
7. Preserve the original and record the proposal as a variation, not a tested result.
8. Work without AI if no model is available.

Do not describe a browser-side WebMCP integration as a remote MCP server. Do not add a backend merely to support speculative agent features.

## Data boundaries

- No recipe content or personal observations are sent to a model by the current app.
- Future integrations must state what leaves the browser, which service/model was used, and what remains local.
- Personal experiments are not published without an explicit user action.

## Claims policy

AI-generated suggestions are proposals. They are not source-documented facts, human-tested results, or nutritional evidence. The UI and documentation must label them accordingly.
