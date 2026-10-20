# Validation results

Executed 2026-10-20 in Linux / Node 24.19.0. Windows commands and paths are provided in README; Windows execution itself was not tested.

| Check | Result |
|---|---|
| Original dependency installation | Passed |
| Original production build | Failed: TS6133 unused `filmStyles` import |
| Updated dependency installation | Passed |
| Updated TypeScript check | Passed |
| ESLint | Passed, zero warnings |
| Vitest unit / rendered DOM integration | Passed: 18 tests across 4 files |
| SQL migrations + repeated seed | Passed in PostgreSQL/PGlite |
| Database private persistence / grants / RLS assertions | Passed: 19 assertions |
| Offline recommendation comparison | Passed regression threshold; exact metrics in evaluation-results.json |
| Updated production build | Passed |
| Real browser end-to-end | Not executed |
| Desktop/mobile visual layout and graph interactions in a real browser | Not verified |
| Live Supabase registration, email verification, login, recovery, Google OAuth | Not verified: no Supabase project configured |
| Live save/refresh/cross-device persistence | Not verified against Supabase; SQL persistence round trip tested locally |
| Live deletion Edge Function/JWT verification | Not executed; source supplied, database cascade tested locally |
| Live Wikidata bulk import and admin upload | Not verified; parser/retry/identity/data quality logic tested with fixtures |
| Cloud deployment / GitHub changes | Not performed; source ZIP delivery requested, no repository remote supplied |

No real browser test or auth journey is labelled as passed based on a unit test. The managed environment did not expose the supported browser-control skill, so no preview server, alternative browser-control path or browser installation was used. Playwright desktop and mobile tests are supplied for execution on the user's machine after setup.

## Executed user journeys

Rendered React DOM tests searched for Kumbalangi Nights and Blade Runner 2049, opened their technical crew, followed Shyju Khalid / Roger Deakins to their filmographies and returned to a credited film. They also selected three favourite films, opened personalized recommendations, checked real title evidence, tested the guest collection boundary and toggled mobile navigation's accessible state. These tests exercise React behavior but do not verify CSS layout.

Unit tests cover both industry collections, provenance presence, no dangling credits, partial/typo/role search, combined filters, exact shared-production collaborators, credit-backed explanations, style attribution isolation, unsupported styles, cold start and dismiss feedback. Ingestion tests cover deterministic IDs, duplicate detection, idempotent upsert SQL generation, 429 backoff, permanent 403 rejection and explicitly TMDB-referenced/deprecated claim exclusion.

## Database isolation tests

The harness creates two emulated authenticated identities and executes the actual SQL migrations, RLS policies, grants and RPCs. It checks anonymous reads/pagination and FTS/trigram/style search; denial of public catalogue writes and TRUNCATE; hidden unpublished movies; atomic save/load round trips; stale-revision protection; rollback after invalid references; one user being unable to read or forge another user's favourites/collection entries; signed-in catalogue write denial; and private-data cascading after account deletion.

PGlite uses PostgreSQL semantics with a minimal test implementation of `auth.uid()`. It is not a hosted Supabase stack and does not test Supabase email delivery, identity token issuance, Edge Function deployment or CORS transport.

## Recommendation comparison

Six handcrafted cases use one known favourite film and a preferred department, with a relevant technician taken from that film's source-backed credit. The same department/industry candidate set is used for all baselines.

| Algorithm | MRR | Hit@3 |
|---|---:|---:|
| Content hybrid | 1.000 | 1.000 |
| Catalogue credit-count popularity | 0.542 | 0.833 |
| Genre overlap | 0.833 | 1.000 |

This tiny regression comparison is biased toward credit affinity by construction. It does not establish real-user recommendation quality, calibrated probabilities, style quality, fairness or generalization. A larger separately labelled relevance dataset and actual user feedback are needed before making such claims.

## Cinephile UI revision

After the visual redesign, TypeScript, ESLint, all 18 existing unit/DOM integration tests, and the Vite production build were executed again and passed. The two generated image assets were visually inspected. No real browser screenshot/layout test was executed; the prior browser verification limitation remains. Database code and catalogue counts were not changed in this revision.
