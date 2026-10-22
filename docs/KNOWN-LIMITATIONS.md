# Current integration status — 2026-10-22

- The app is hosted from GitHub on Vercel. TMDB API routes and the library are implemented; live metadata requires `TMDB_READ_ACCESS_TOKEN` in Vercel's server environment.
- Global search and discovery are paginated. The UI does not copy the entire TMDB database into the browser. Upstream page limits are displayed accurately.
- Malayalam discovery filters original language. Hollywood discovery selects English-language films from the US/UK; title searches are global and say so.
- TMDB credits and biographies may be incomplete. The app shows the actual available data and no invented styles or credits.
- API data is cached for up to ten minutes in a warm function, and detail responses may remain in Vercel's CDN for an hour plus its stale window. Refresh rechecks the connection and requests the library through those caches; it is not a cache purge or a scheduled full-database mirror.
- Each provider keeps its own stable IDs. A similarly titled bundled record and a TMDB record are not silently merged. Avoid selecting both versions when building a taste profile.
- Signed-in saves of TMDB films require the new Supabase migration plus server-side Supabase URL/service key. Guest taste discovery works without a database. Account import is atomic per film, while account profile saves keep the existing revision checks.
- No authenticated TMDB or hosted Supabase calls could be exercised without the owner's credentials. Automated provider fixtures are identified as tests; they are not evidence of successful live ingestion.

The following notes describe the earlier snapshot implementation and remain relevant where not superseded above.

# Known limitations and connection checklist

- This delivery is a source-ready implementation with working local catalogue discovery, not a live configured Supabase deployment. No credentials were requested in chat or embedded in source.
- Actual catalogue is 10 films / 23 technicians / 35 credits. It does not meet the aspirational 500 / 1,000 coverage targets. Filmographies are partial; missing biographies, synopses and images are explicitly unavailable.
- Some source-checked facts come from community Wikidata statements without upstream citations. They were not all independently checked against official screen credits. Three style tags are labelled editorial interpretations with interview evidence.
- Initial Hollywood collection includes international English-language studio productions; the bulk discovery query is intentionally narrower (English + US production statement). Human review is required for broader international classification.
- No embeddings or trained ML model is claimed. The recommender is an explainable content ranking algorithm with small-fixture regression evaluation, not proven production personalization.
- Missing departments remain visible as available filters with meaningful no-data states. Automated ingestion maps only cinematography/editing/composition; more detailed technical departments require reviewed mappings and sources.
- Connected search runs indexed PostgreSQL queries. The app loads the modest public catalogue in pages for local advanced filtering, ranking and graph calculation. It does not yet stream an unbounded global filmography.
- Private writes are atomic full-profile snapshots with revision checks. Concurrent saves are rejected with a reload message, rather than silently merging two devices. Normal session changes clear private state. Guest taste is session-local; it is replaced by an account's saved preferences when that account signs in.
- Remote administrative upserts are resumable but not one whole-import transaction. Failed imports are logged; new records are staged unpublished. Updates to existing published records require editorial care.
- The initial seed SQL is safe to repeat against its same deterministic IDs. Use the remote uploader for a database containing previously imported external identities; it resolves existing IDs and flags conflicts.
- Google sign-in requires dashboard provider setup. Email verification/recovery depend on Supabase's allowed redirects and working SMTP. Account deletion requires deploying the Edge Function and setting the exact app origin.
- Browser layout, real graph pointer interaction, real email/auth flows and live cross-device persistence remain unverified. Included DOM and SQL tests are reported separately.
- The original ZIP also runs locally in VS Code on Windows with Node/npm. Environment examples contain no live credentials.

Before public deployment, connect your own Supabase project, apply migrations/seed, configure Auth and the deletion function, then execute the included desktop/mobile browser tests and verify the live account journeys listed in TEST-RESULTS.md. Expand source-backed data through review rather than increasing counts with generated credits.
