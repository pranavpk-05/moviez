# TMDB library and sync

## Activation

Obtain your own **API Read Access Token** from https://www.themoviedb.org/settings/api. This is the long bearer token, not the shorter v3 API key. Complete TMDB's application/terms flow in your own account.

Add `TMDB_READ_ACCESS_TOKEN` to the **moviez** project's Vercel environment variables, then redeploy. The value must never be prefixed with `VITE_`, placed in Git, or pasted into a public issue. The deployed `/api/tmdb?resource=status` endpoint exposes only `{ "configured": true/false }`; it never returns a token. A configured flag reports the presence of a token; authenticated movie requests establish whether that token is valid.

For local development, add the variable to ignored `.env.local` and restart Vite. The development middleware serves the exact Node handler used by Vercel. Static preview alone cannot serve API requests.

## App behavior

- `/#library` browses paged TMDB results and searches original, localized and alternative movie titles.
- Malayalam browsing uses original-language `ml`. Hollywood browsing selects English-language US/UK productions. Search spans all cinema and clearly labels that scope because TMDB's title-search endpoint has no matching collection filter.
- Opening a movie loads its synopsis, available poster/backdrop, release year, runtime, TMDB rating, production countries and available technical crew. IMDb IDs provide outbound IMDb links; IMDb data/ratings are not claimed.
- Clicking a crew member opens their biography and available movie crew filmography, grouped by film and keeping multiple jobs.
- Movies can be added to taste discovery. The app retains exact roles and source links; it does not invent style evidence or fill absent biographies/credits.
- Home refresh loads a small current selection from Malayalam and Hollywood discovery and merges it with the included catalogue. Full detail is loaded on demand as visitors browse; the whole global database is never loaded into memory.
- Provider IDs are stable SHA-256-derived UUIDs, compatible with the existing Supabase foreign keys. Different-provider identities are not silently conflated by name or title.

## Caching and errors

The server uses TMDB's bearer authentication over HTTPS. It accepts only the fixed status/home/movies/movie/person/import operations, bounds IDs/search/pagination, uses timeouts, and retries rate limiting once with a bounded wait. It never forwards arbitrary URLs, upstream error bodies or secret headers to visitors.

Warm instances cache upstream responses for ten minutes (bounded to 200 entries). Vercel caches discovery/home responses for ten minutes and film/person details for an hour, with short stale windows. Status, imports and errors are not cached. This is on-demand refresh, not a scheduled database-wide sync or an immediate cache purge. Availability and coverage depend on TMDB; per-query browsing stops at its supported 500-page ceiling, with accurate UI text.

Until a token is configured the public library displays a connection-pending state with a link to included films. Failed upstream requests expose a retry action, without presenting fabricated results.

## Optional cross-device account sync

Guest taste uses the app's current session. To persist TMDB choices to accounts:

1. Configure the existing Supabase frontend/auth integration.
2. Apply **all** migrations, including `supabase/migrations/202610220001_tmdb_sync.sql`.
3. Configure server-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel.

Signed-in imports verify the user's Supabase access token, fetch the film from TMDB on the server, and invoke the service-role-only `sync_tmdb_movie` RPC. The browser cannot submit arbitrary catalogue records or invoke that RPC itself. Each film import, genre replacement and crew replacement is transactional; re-importing a film preserves identity and saves. The existing owner-scoped profile RPC saves favourites/collections with revision checks. Referenced TMDB records are imported before a profile write, so they satisfy database foreign keys. A failed sync does not claim the private choice was saved.

## Attribution and rights

The library shows TMDB's approved logo, retrieved from its official attribution page, and its required notice. Connected home pages also show attribution in the footer. Each record points to its original TMDB page. API access, data and images remain subject to the owner's TMDB agreement and any applicable image rights; commercial use requires the appropriate license.

Primary documentation:

- https://developer.themoviedb.org/docs/getting-started
- https://developer.themoviedb.org/docs/authentication-application
- https://developer.themoviedb.org/docs/faq
- https://developer.themoviedb.org/reference/discover-movie
- https://developer.themoviedb.org/reference/search-movie
- https://developer.themoviedb.org/reference/movie-details
- https://developer.themoviedb.org/reference/movie-credits
- https://developer.themoviedb.org/reference/person-movie-credits

## Verification and limits

The TypeScript/Vite production build passed. All 31 Vitest tests passed. The in-memory PostgreSQL/PGlite run passed 26 assertions across the original schema and TMDB migration. API/UI fixtures are synthetic test records, not claimed live TMDB results. Database tests cover repeat imports, account-role permission rejection, public catalogue read-through and rollback when a credit fails. Browser inspection checks the real connection-pending state. Live TMDB responses, real TMDB images and hosted Supabase account sync need the deployment owner's token and database configuration.
