# Original project audit

Baseline: `npm install` succeeded; `npm run build` failed with TS6133: unused `filmStyles` import in src/main.tsx (2026-10-20).

The supplied ZIP contained one React/TypeScript/Vite app (no repository metadata). One `main.tsx` implemented hash navigation for home, explore, search, person, film, taste, recommendations and saved. `data.ts` contained 12 Malayalam films and 10 technician profiles with illustrative, unverified credits and editorial styles. Several crew entries linked no profile. `style.css` defined cinematic dark/gold typography, initials portraits, gradient posters, responsive cards and mobile navigation. Three localStorage arrays persisted favourites, saves and styles. No auth, database, migrations or tests existed.

Kept: Vite, React, TypeScript, hash navigation, original CSS/card identity, hero, department browsing, film and technician journeys, taste workflow and explainable discovery. Added a shared catalogue model for both industries, source evidence, Supabase adapters, authentication, private saves/collections, search/filtering, graph, tests and ingestion. Original source snapshots are retained in this directory for review. No Next.js migration is needed.
