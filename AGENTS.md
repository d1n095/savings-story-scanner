<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# AGENTS.md — LifeApp Execution Protocol

Permanent, non-optional working rules for every agent and contributor task in this
repository. Read this file first, then the documents it references. If any other
instruction conflicts with this file, this file wins unless the user explicitly
overrides it in the current task.

## Referenced documents (do not duplicate them)

| Document | Purpose |
| --- | --- |
| [docs/PRODUCT_BLUEPRINT.md](docs/PRODUCT_BLUEPRINT.md) | What the product is, layers, journeys, standalone strategy |
| [docs/MODULE_STANDARD.md](docs/MODULE_STANDARD.md) | Required module structure, manifest, lifecycle, compatibility |
| [docs/DEFINITION_OF_DONE.md](docs/DEFINITION_OF_DONE.md) | Mandatory completion gates |
| [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md) | What exists, what is prototype, defects, debt, risks |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Versioned architecture decision log |
| [docs/REQUIREMENTS_TRACEABILITY.md](docs/REQUIREMENTS_TRACEABILITY.md) | Requirement → component → files → DB → tests → status |
| [docs/LIFEAPP_ARCHITECTURE.md](docs/LIFEAPP_ARCHITECTURE.md) | Layer model and current structural inventory |
| [docs/LIFEAPP_MODULE_SYSTEM.md](docs/LIFEAPP_MODULE_SYSTEM.md) | Life Modules, Runtime, SDK, Life Store |
| [docs/LIFEOS_INTEGRATION_PLAN.md](docs/LIFEOS_INTEGRATION_PLAN.md) | LifeOS/LifeAI integration phases |

## Permanent project rules

### Product model
- LifeApp is the modular, user-facing body of the ecosystem.
- LifeOS is the separate platform and security layer.
- LifeAI/MainAI is the separate intelligence and orchestration layer.
- LifeAI may request actions; LifeOS must authorize and enforce them.
- LifeApp must never become a second independent MainAI core.

### Modular architecture
- Every product domain is designed as an installable first-party module.
- Modules are independently versioned, testable, replaceable and removable.
- A module may run inside LifeApp and later ship standalone without duplicating domain logic.
- Module-to-module communication uses declared contracts, commands and events only.
- Modules must not import internal implementation details of other modules.
- Shared infrastructure lives in the platform/shared layers, never inside a domain module.

### Safety
- Never expose secrets, API keys or privileged logic in frontend code.
- Never add paid services, external providers or new API keys without explicit approval.
- Never run destructive migrations or delete user data without explicit approval.
- Preserve existing salary, work-shift, calendar, finance, scanner and historical data.
- All user-owned records require authenticated ownership enforcement and appropriate RLS.
- Frontend validation is usability only; authorization and sensitive validation are server-side.

### Engineering
- Inspect existing code before creating new abstractions.
- Reuse existing components, services, types and conventions.
- No duplicate files, parallel implementations or temporary production paths.
- TypeScript stays strict. No `any`, unsafe casts or silent error swallowing.
- All new functionality ships empty, loading, success and error states.
- User-facing text is Swedish. Code, identifiers and technical comments are English.
- No placeholders, fake functionality, mocked success responses or unfinished TODOs presented as complete.

### Change control
- Modify only files required by the approved milestone.
- Do not refactor unrelated working code.
- Database and contract changes are backward-compatible or explicitly versioned.
- Every requirement is traceable to implementation files and tests.
- Update documentation when architecture, contracts, configuration or behavior changes.

## Milestone workflow (mandatory, in order)

### A. Reconnaissance
- Read the relevant files and the recent changes touching them.
- Search for existing implementations before creating anything.
- Identify frontend, backend, database, auth, routing, configuration and test impact.
- Identify conflicting or duplicated code (see the root-file duplication risk in CURRENT_STATE).
- Establish a known-good baseline: `bun run test`, `bun run lint`, `bun run build` before changing code.

### B. Plan
- Define scope and explicit non-scope.
- List the files expected to change.
- Define data flow and trust boundaries (who authorizes, where it is enforced).
- Define acceptance criteria and the tests that prove them.
- Identify risks, migrations and rollback strategy.
- Do not write code before the plan is internally coherent.

### C. Implementation
- Implement one bounded vertical slice.
- Complete the frontend, backend, database, configuration and error handling that slice needs.
- Never stop at UI-only or schema-only.
- Never leave disconnected routes, unused services or uncalled backend logic.

### D. Verification
- Run every applicable command discovered in `package.json` (see below).
- Fix failures introduced by the work.
- Verify persistence after reload.
- Verify authorization and cross-user isolation.
- Verify empty, loading, success and error states.
- Verify mobile and desktop viewports.
- Inspect browser console and failed network requests.
- Review the final diff for unrelated modifications.

### E. Reporting
Report with evidence, and distinguish **verified working** / **implemented but not verified** /
**blocked** / **deferred**:
- Requirements completed and not completed.
- Files created, modified, deleted.
- Database and configuration changes.
- Tests run with exact outcomes.
- Browser flows verified.
- Security findings.
- Remaining risks and blockers.

No unsupported claims. "Fully working" is forbidden unless the corresponding check was run.

## Repository commands

```bash
bun run test      # vitest run
bun run lint      # eslint .
bun run build     # vite build
bun run build:dev # vite build --mode development (prerender check)
bun run format    # prettier --write .
```

Typecheck runs through the build; do not treat a passing typecheck as completion.

## Autonomy

Continue fixing ordinary implementation, type, lint and test failures without asking.

**Stop and report** only for:
- destructive or irreversible operations
- paid services
- secrets or credentials
- an unresolved product decision
- a conflict with existing architecture
- a blocker that cannot be resolved from the repository
