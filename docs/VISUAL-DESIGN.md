# Behind the Frame — Cinematheque edition

A film-journal / screening-room direction, with a charcoal background, parchment text, tungsten gold, muted olive and teal. The revision keeps the discovery, onboarding, favourites, profiles and collaboration interactions intact.

## What changed

- Projection-room hero with motion-picture camera, reels, celluloid and warm light.
- Original cinema atmosphere studies in layered contact sheets and a subtle site-wide film-strip background.
- Viewfinder marks, frame counters, restrained grain, film-journal mastheads and widescreen detail-page backdrops.
- More cinematic movie cards and taste selections, craft cards, borders, spacing, typography, hover states and mobile layouts.
- Reduced-motion support disables the slow background/reel animation when requested by the visitor's system.

## Artwork and truthfulness

The backgrounds are original generated atmosphere studies. They do not depict actual frames from the listed films or imply photographs of technicians. The UI labels decorative film card art as ART STUDY. Licensed movie.poster images, when supplied, take precedence over generated decorative card art. No generated image is used as a factual source or recommender input.

Assets are bundled at:

- `src/assets/cinephile-hero.png` — original projection-room hero, 1920 × 819.
- `src/assets/cinema-contact-sheet.png` — six equal scene studies, 1536 × 1024, cropped through CSS.

The generated artwork adds about 4.7 MiB of local raster assets. The two source PNGs and production copies are included in the ZIP; no third-party image API is called at runtime.

Generation used the built-in image generation tool, not the fallback CLI or an external API key. The output was copied into this project and visually inspected. Styling lives in `src/cinephile.css`; `src/CinemaAtmosphere.tsx` owns the reusable decorative artwork layers.

## Generation prompts

### Hero

Use case: stylized-concept. Asset type: cinematic website hero background for a cinephile film technician discovery website called Behind the Frame. Create a premium photorealistic editorial cinema triptych as ONE continuous panoramic image, landscape 1536x1024 or wider composition. No words, no letters, no typography, no logos, no watermarks. Main composition on the RIGHT TWO THIRDS: a large vintage 35mm motion picture camera with beautiful glass lens and real film reels in a dim projection room, clapperboard and curling strips of celluloid on the table, warm tungsten projector beam through smoke; behind it a collage of four original cinematic frames: lush Kerala backwater landscape at dusk, rain-drenched neon city street at night, desert silhouettes at sunset, black-and-white closeup of a film projector lens. These must be original evocative scenes, not recreations of any particular movie or actor, no recognisable faces. LEFT THIRD: very dark charcoal near-black negative space with soft texture for website heading overlay. Sophisticated restrained amber/gold, desaturated olive, deep teal, oxblood details. Tactile film grain, halation, chiaroscuro lighting, rich analog tones, museum quality film culture aesthetic, realistic materials, carefully composed depth. Keep important camera/lens in middle-right visible for both desktop and mobile crops.

### Contact sheet

Use case: stylized-concept. Asset type: a seamless website contact-sheet artwork atlas, 1536x1024 landscape, EXACTLY SIX square photographic panels arranged in a strict 3-column by 2-row grid, every panel identical size, edge to edge, absolutely NO borders, gaps, text, letters, watermarks, logos, frames or typography. Each square is an original evocative cinematic composition, not from any existing film and no recognisable actors. TOP LEFT: Kerala backwater at blue hour, one small canoe and palms silhouetted, deep emerald and muted gold. TOP MIDDLE: rainy neon city lane with a tiny distant silhouette, deep teal and warm orange. TOP RIGHT: vast alien desert dunes at amber dusk, two small unidentifiable travelers in silhouette, beautiful lens flare. BOTTOM LEFT: high-contrast black and white stairwell in a noir city, diagonal window shadows, very cinematic. BOTTOM MIDDLE: remote rocky coast in a storm with one small warm lighthouse, desaturated navy blue and silver. BOTTOM RIGHT: nostalgic railway station in Kerala under monsoon rain, warm tungsten lamps, empty platform and lush foliage, olive and rust. Sophisticated motion-picture cinematography, tactile 35mm film grain, analog halation, restrained photographic compositions, deep blacks, art-house film culture editorial aesthetic. These are decorative mood studies for a website, not actual movie stills. Maintain precise grid alignment to allow six equal CSS crops.
