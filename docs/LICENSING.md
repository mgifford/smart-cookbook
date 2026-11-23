# Licensing Status and Risks

**Status: unresolved. This document records the conflict; it does not choose a licence for the project owner.**

---

## 1. Current conflict

- The repository root contains `LICENSE`, which is the **GNU Affero General Public License v3.0 (AGPL-3.0)**.
- `LICENSE.md`, the README, and the in-app copyright panel state **Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0)**.
- GitHub will detect and display the root licence file. The current repository therefore presents two incompatible licences.

A project owner must decide which licence applies to which material, then make the files and UI consistent. This audit does not make that legal decision.

---

## 2. Distinctions that should drive the decision

| Material | Typical treatment | Notes |
|---|---|---|
| Application source code | Software licence (for example AGPL-3.0 or MIT) | The existing root file is AGPL-3.0 |
| Original recipe records written for this project | May be CC BY-SA 4.0 if the author chooses | Only original expression can be licensed by the author |
| Ingredient facts and basic methods | Generally not protected by copyright | Facts and ideas are not owned; expression can be |
| Third-party recipe text, headnotes, photographs | **Do not relicense without permission** | Attribution does not grant redistribution rights |
| User-imported personal recipes | User-controlled | Do not publish personal observations without explicit action |

The repository contains recipes with `meta.source` links to third-party sites. Some steps may be close paraphrases of those sources. The project should review imported text for expressive copying and preserve attribution. Do not assume that a CC BY-SA notice on the repository grants rights over third-party content.

---

## 3. Recommended next steps for the owner

1. Choose one software licence for the code and one content licence for original recipe records.
2. Replace or rename the conflicting licence files so only the intended licence is detected at the root.
3. Add a short `NOTICE`/provenance statement explaining what is original, what is adapted, and what is third-party.
4. Review existing recipe text for close copying from linked sources; rewrite or remove expressive passages that are not licensed.
5. Update the in-app copyright panel and README after the decision.
6. Do not apply CC BY-SA to third-party content whose rights are unknown.

Until then, treat the licensing status as unresolved and do not present the repository as unambiguously CC BY-SA 4.0 or AGPL-3.0.
