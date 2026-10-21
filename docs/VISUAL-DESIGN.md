# Behind / Frame — cinema journal redesign

The interface uses a charcoal canvas, warm amber actions, DM Sans typography and selective Playfair Display italics. Shared spacing, subtle borders, readable text and clear active navigation connect the landing page, discovery, profiles, collections and taste flow.

## Visual assets

- `src/assets/poster-wall.jpg` is the reference collage supplied for this redesign. It is bundled by Vite, so the hero does not depend on a third-party image host. The angled wall uses directional gradients to preserve text contrast on desktop and mobile.
- Existing atmosphere studies remain decorative artwork for film cards without official posters. They are labelled “ART STUDY”; the poster collage is decorative and does not imply those films are available in the catalogue.
- Artist cards use intentional monograms and craft icons when verified photos are unavailable. Counts come from catalogue credits. The landing page features artists from both cinema collections without duplicating people.
- `public/brand-mark.svg` provides the matching favicon.

## Layout and interaction

The landing page leads with “Look beyond the screen,” primary discovery and taste actions, then direct routes into Malayalam cinema, Hollywood cinema and personal taste. Artist cards, the taste invitation, film collections, department discovery and collaborations follow.

The mobile header has an expandable menu with an accessible control relationship, active-page indicators and Escape dismissal. A skip link supports keyboard navigation. Route changes reset scroll after rendering; decorative motion respects reduced-motion preferences. A 390px layout uses two-column film and artist grids and stacked discovery paths.

Existing catalogue data, credit sources, authentication boundaries, taste selection and recommendation logic are retained. The UI redesign does not add film records or configure Supabase.

## Verification

- Production TypeScript/Vite build passed.
- All 18 existing Vitest tests passed.
- Browser inspection covered the complete desktop landing page and the 390px mobile layout.
- Browser interaction verified mobile menu → Hollywood search → Blade Runner 2049 → Roger Deakins profile and collaboration graph.
- Browser interaction verified selecting three films and opening recommendation explanations.
- Authenticated persistence was not exercised: the current live site uses the starter catalogue without a configured account integration.
