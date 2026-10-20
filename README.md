# Behind the Frame

A React + TypeScript + Vite film technician discovery app, upgraded from the supplied MVP. Malayalam and Hollywood use the same catalogue, screens, recommender and database schema. The cinephile edition layers original cinema artwork, contact sheets, film-strip backgrounds, warm projector light and film-journal typography over the shared discovery experience. Hash navigation and all existing application features are retained.

**What runs immediately:** source-linked film and technician browsing, search, filtering, taste onboarding, explainable recommendations, and the collaboration explorer. **What needs your Supabase project:** registration/login, email verification, password recovery, persistent saves/collections/profile preferences, and account deletion. No live Supabase project was configured during this build.

## Windows 11 quick start

Install **Node.js 22.12+ (Node 24 LTS recommended)**, open the extracted project folder (the one containing `package.json`) in VS Code, then use its terminal:

```powershell
npm ci
npm run dev
```

Open the URL Vite prints, usually `http://localhost:5173`. Run these commands in the folder containing **package.json**. Do not run them from the outer ZIP/extraction folder if you have not opened the actual project folder yet.

You can use the starter catalogue without an environment file. Guests can explore taste during the session. Saving technicians and collections requires sign-in; the app never simulates a signed-in account or pretends localStorage is cross-device persistence.

## Included catalogue

| Collection | Movies |
|---|---:|
| Malayalam | 5 |
| Hollywood | 5 |
| Unique technicians | 23 |
| Genuine sourced credit relationships | 35 |
| Film-specific editorial style annotations | 3 |

This is a deliberately small starter batch, **not** the requested coverage target of 500 films/1,000 technicians. Filmographies are partial. Missing biographies, synopses, photos and film posters have neutral unavailable states. The cinephile edition uses original AI-generated atmosphere studies for the hero, contact sheets and decorative card backgrounds. These are labelled as art studies, not movie stills or official posters; technician initials remain the identity fallback. The artwork is bundled locally, and no remote image service is needed. See docs/VISUAL-DESIGN.md. Google Fonts remain external and fall back to system serif/sans-serif fonts if unavailable.

Read [dataset and rights notes](docs/DATASET.md) before expanding data.

## Connect Supabase

Use a Supabase project you control. Apply the schema before setting frontend configuration. Never put a service-role or secret key in `VITE_*`, browser code, a screenshot, Git or this README.

### 1. Apply migrations and starter data

The simplest option uses Supabase's **SQL Editor**, in this order:

1. `supabase/migrations/202610200001_core.sql`
2. `supabase/migrations/202610200002_api.sql`
3. `supabase/seed.sql`

The migrations create new tables and functions in `public`. Use a fresh project or inspect for name collisions before applying to a project containing another application. Seed SQL is intended for initial setup and repeat imports of this same starter. For adding external records to an existing project, use the uploader, which resolves existing IDs.

Alternatively, install the Supabase CLI and link your project through its supported authorization flow:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --include-seed
```

For a local Docker-backed Supabase project:

```powershell
npx supabase start
npx supabase db reset
```

`db reset` is for the local development database: it deletes its local data before recreating the schema. The automated database tests below run in memory and do not need Docker.

The auth trigger creates profiles for new registrations. If your project already has accounts, backfill once in the SQL Editor:

```sql
insert into public.profiles (id, display_name)
select id, coalesce(raw_user_meta_data->>'display_name', '') from auth.users
on conflict (id) do nothing;
```

### 2. Configure the local app

Copy `.env.example` to `.env.local` using VS Code or:

```powershell
Copy-Item .env.example .env.local
```

Windows Command Prompt equivalent: `copy .env.example .env.local`.

Set **only** these browser-safe values for the app:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
VITE_GOOGLE_AUTH_ENABLED=false
```

Obtain the URL and publishable/anon key from your own Supabase dashboard; they are public client configuration, protected by database RLS. Restart Vite after changing the file. The ignored `.env.local` is local configuration, not project source. Leave server-only variables blank unless running the optional uploader.

When configured, the app reads **only the database catalogue**. An error or empty database is reported instead of silently substituting demo data. Guest access remains available through published-record RLS policies.

### 3. Configure authentication

In Supabase Authentication settings:

- Enable Email/password sign-up and **Confirm email**. Configure production SMTP before relying on email delivery.
- Set Site URL to `http://localhost:5173` for local use. Allow that exact origin/path as a redirect URL.
- Add your production site URL to the redirect allowlist before deploying.
- To enable Google, configure its provider/client credentials in the dashboard, then set `VITE_GOOGLE_AUTH_ENABLED=true`. The button is hidden otherwise.
- Configure password requirements to at least 8 characters. The form enforces this minimum locally.

Verification/OAuth/recovery links return to the app's base URL. Supabase consumes the auth fragment, and the `PASSWORD_RECOVERY` event opens the password-change form. Do not manually navigate away while a recovery link is being processed.

### 4. Deploy account deletion

The server-side Edge Function verifies the caller's JWT, deletes only that caller and lets foreign-key cascades remove their private application data. Its service key is supplied by Supabase, never bundled into the browser.

```powershell
npx supabase secrets set APP_ORIGIN=http://localhost:5173
npx supabase functions deploy delete-account
```

Use the production origin for a production deployment. The origin is exact, with no trailing slash. Function CORS is intentionally restricted to this configured app origin; use a separate function/project for local and production work if both must run simultaneously. Account deletion is disabled until the user types `DELETE` and explicitly clicks the permanent-delete button.

## Import more films

No TMDB integration is included. The Wikidata importer uses CC0 structured statements, excludes explicitly TMDB-referenced/deprecated statements, and imports no article bodies, photographs, biographies or synopses.

Set `WIKIDATA_USER_AGENT` in `.env.local` with a contact email, then:

```powershell
npm run ingest:wikidata -- --limit=250
```

This **discovers up to 250 candidate films per industry** and writes `data/pending-catalogue.json` plus page checkpoints. It does not guarantee that every candidate has usable credits, and it publishes nothing. Malayalam is selected by original language. The initial Hollywood discovery query selects English-language films with United States production-country statements. International productions without that country statement need an explicitly reviewed import list rather than automatic classification as Hollywood.

The importer covers Wikidata's director-of-photography, editor and composer properties. All 14 required departments exist in the schema; additional departments need reviewed property/job mappings and sources. Pending imports have `needs-review` provenance. Review identities, title/year, collection, references and exact credits before changing them to `source-checked`. An external-ID conflict or same-name/different-ID person is a review stop, not an automatic fuzzy merge.

To upload records, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` **only in your local ignored environment file** or your server's secret environment. Run this Node CLI locally; never host it as a public endpoint:

```powershell
npm run ingest:upload -- data/pending-catalogue.json
npm run ingest:upload -- data/pending-catalogue.json --publish-reviewed
```

The first command stages unpublished records. The second requires all provenance to be source-checked and publishes after successful imports. Existing published records retain their publication state. REST upserts and job logs permit reruns after a failure; a multi-record remote import is not one database transaction, so review changes to already-published records before uploading. The user-preferences write RPC, separately, **is atomic** and rejects stale revisions from another device.

To regenerate initial seed SQL after editing the included JSON:

```powershell
npm run seed:generate
```

`make-snapshot.py` is the optional editorial batch builder (Python 3); Python is not needed to run the app or the Node importer. Stable IDs and `data/identity-map.json` preserve the reviewed technician identities.

## Recommendation behavior

`src/data.ts` ranks technicians using normalized direct favourite-film affinity (0.50), evidence-backed style overlap (0.25), genre Jaccard overlap (0.15), department relevance (0.10), and a small explicit liked-feedback term (0.08). Dismissed technicians are removed. Department and industry preferences filter relevance. It never adds raw film count or popularity to the production score.

Style annotations are attached to a **particular technician and film**; they do not propagate to everyone on that crew. Unsupported styles are retained as user preferences for later data but do not create claims. Explanations link real credited films and the annotation source. Scores remain internal and are not shown as calibrated match percentages. Cold start gives an explicitly described alphabetical starting point; three favourite films unlock the full onboarding results action.

Offline evaluation compares the hybrid ranking with catalogue-credit-count popularity and genre-overlap baselines. The six handcrafted regression cases are not a held-out user study; see `docs/evaluation-results.json` for exact results and limitations.

## Architecture and security

- `src/App.tsx`: retained cinematic screens, hash routing, shared filters, taste, collections and discovery.
- `src/data.ts` / `src/types.ts`: shared model, local discovery, ranking and collaboration evidence.
- `src/backend.ts`: Supabase client, paginated catalogue API and private-data RPC adapter.
- `src/platform.tsx`: session boundary, private-data loading and serialized preference writes.
- `src/Account.tsx`: registration, login, recovery, Google OAuth, profile editing and deletion.
- `src/CollaborationGraph.tsx`: React Flow graph capped at 24 collaborators, with shared-film timeline and department/industry filters.
- `supabase/migrations`: normalized catalogue/private tables, indexes, FTS/trigram search, grants, RLS, profile trigger and RPCs.
- `scripts`: repeatable ingestion, validation, initial seed, PostgreSQL security tests and evaluation.

Catalogue tables are read-only to public/authenticated app roles. Published movies/technicians gate credits and style evidence. Every private row is owned by `auth.uid()`; collection entries also use a composite owner foreign key. The API functions use invoker privileges, except the narrowly scoped auth-user trigger. Private data is cleared on account changes. Admin ingestion never runs in the browser. Multiple roles on one movie are separate unique `(movie_id, technician_id, role)` credits.

The client fetches paginated catalogue records into memory for local ranking and graph construction. Connected search uses PostgreSQL FTS, substring and trigram matching; advanced filters then refine the fetched published catalogue. This is suitable for the intended modest initial catalogue; much larger data requires server-side ranking/filtering and lazy profile loads.

## Validation

```powershell
npm run typecheck
npm run lint
npm test
npm run test:db
npm run evaluate
npm run build
```

Or use `npm run check` for all of the above. Database tests use a PostgreSQL engine in PGlite with emulated `auth.users`/`auth.uid()` and real SQL RLS, grants and migrations; they do not contact or impersonate a hosted Supabase Auth service.

Playwright tests for desktop/mobile discovery and authenticated persistence are included. To run them on your Windows computer, start the app in one terminal, then in another:

```powershell
npx playwright install chromium
npm run test:e2e
```

For authenticated persistence, use a dedicated verified test account and set `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` in the terminal environment, not source files. That test changes the account's saved technicians. Set `E2E_BASE_URL` for an already-running deployment if needed. `test:e2e` does not start a server automatically.

See [TEST-RESULTS.md](docs/TEST-RESULTS.md) for checks actually executed and the unverified live/browser journeys.

## Production build and deployment

```powershell
npm run build
npm run preview
```

Deploy the contents of `dist/` to any HTTPS static host that supports Vite output. Keep `index.html` and `assets/` together. Hash routes need no special route rewrite. Build with the browser-safe Supabase variables set; Vite embeds these at build time, so changing host runtime environment variables alone does not change an already-built bundle. Never set server-only ingestion keys as build inputs.

Set Supabase's production Site URL, allowed redirects and deletion function `APP_ORIGIN` to your actual deployment origin. Verify registration, email delivery, reset links, Google (if enabled), cross-device saves and account deletion against that deployment before treating it as production-ready.

This deliverable is source code and local build output, not a deployed cloud service. No cloud resources were created, no costs incurred and no GitHub repository modified; the supplied ZIP contained no repository remote.
