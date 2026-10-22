> October 22 update: the counts below describe the bundled snapshot. The new TMDB library is live-data capable and requires a server-side token; see TMDB-INTEGRATION.md. No live provider responses were used to inflate snapshot counts.

# Dataset provenance, coverage and rights

Snapshot date: 2026-10-20. Actual coverage: **5 Malayalam films, 5 Hollywood films, 23 unique technicians, 35 credit relationships, 3 film-specific style annotations**. These are complete records for this small starter catalogue, not complete industry filmographies. No coverage target was filled with fabricated records.

## Film sources

| Film | Year | Industry | Source |
|---|---:|---|---|
| Kumbalangi Nights | 2019 | Malayalam | https://www.wikidata.org/wiki/Q60737728 |
| Manjummel Boys | 2024 | Malayalam | https://www.wikidata.org/wiki/Q124636001 |
| Bangalore Days | 2014 | Malayalam | https://www.wikidata.org/wiki/Q16837651 |
| Maheshinte Prathikaaram | 2016 | Malayalam | https://www.wikidata.org/wiki/Q23681158 |
| Premam | 2015 | Malayalam | https://www.wikidata.org/wiki/Q19895421 |
| Blade Runner 2049 | 2017 | Hollywood | https://www.wikidata.org/wiki/Q21500755 |
| Interstellar | 2014 | Hollywood | https://www.wikidata.org/wiki/Q13417189 |
| Skyfall | 2012 | Hollywood | https://www.wikidata.org/wiki/Q4941 |
| Dunkirk | 2017 | Hollywood | https://www.wikidata.org/wiki/Q21935651 |
| 1917 | 2019 | Hollywood | https://www.oscars.org/oscars/ceremonies/2020 |

For 1917, the included credits are Roger Deakins (cinematography) and Thomas Newman (original score), supported by the Academy's category records. Do not infer a complete crew from an awards page.

Each movie, technician and credit in `data/catalogue.json` has source name, original source ID, URL, rights basis, checked date and status. Technician QIDs were resolved from linked Wikidata entities and retained in `data/identity-map.json`. Internal IDs are deterministic namespace UUIDs. Identity is not inferred from name similarity. A technician's source points to the production that supports the initially displayed role; their own QID is also retained as an external identifier.

## Verification meanings

`source-checked` means that the included statement was checked against the linked source during preparation. It does **not** mean the source is error-free, that all its upstream references were audited, or that official screen credits were independently reviewed. Several Wikidata statements themselves have no attached references; this limitation is shown in provenance notes. Imported records start as `needs-review` and remain unpublished until reviewed explicitly.

Genre labels are original editorial discovery categories, not externally measured or exhaustive classifications. Display/original titles in the starter use their English/transliterated forms. Native-script titles can be added from verified entity labels by the importer. Production countries for Hollywood films were left unavailable in the starter rather than guessing a full co-production list. Malayalam production country is India. Runtime is included only for the three source-supported records where it was retrieved. Biographies and synopses remain unavailable.

## Rights decisions

- **Wikidata structured statements:** CC0-1.0, per https://www.wikidata.org/wiki/Wikidata:Copyright and https://www.wikidata.org/wiki/Wikidata:Licensing. This applies to structured data, not arbitrary Wikipedia article text or Wikimedia images. The application stores only the small selected statement set; it does not reproduce articles.
- **Academy credit facts:** a small set of factual category/credit associations. No photographs, marks, article prose, awards-page layout or bulk database was copied. The rights-basis field describes factual metadata use rather than claiming the page is CC0.
- **Editorial style annotations:** original short interpretations, labelled as such and supported by a specific credited film and published first-person interviews. No source article bodies are stored or passed into an AI service. They are inspectable tags used by a deterministic content recommender, not model training data or embeddings.
- **TMDB:** the live film library fetches metadata, posters, profiles, crew credits and filmographies through the authenticated TMDB API. It requires the deployment owner's token and displays TMDB's approved logo and required notice. TMDB metadata is community-maintained; an API fetch records provenance, not independent verification against screen credits. Images remain subject to their owners' rights and TMDB's terms. Imported genres and credit relationships can contribute to taste ranking; no inferred style annotations are created. The existing Wikidata importer still excludes explicitly TMDB-referenced statements in its separate CC0-only workflow.
- **Images:** the included snapshot has no official film posters or technician photos; the connected TMDB library provides them through TMDB image URLs. Technician initials remain identity fallbacks. Two original AI-generated cinema illustrations are bundled as decorative atmosphere studies for backgrounds, contact sheets and cards. They are not movie stills, official posters or technician portraits, and they are not used in recommendation scoring. The card UI identifies these as ART STUDY. Prompts and asset locations are documented in VISUAL-DESIGN.md. The schema supports images only with an explicit image rights basis; the importer does not fetch image properties or bypass access controls.
- **Fonts:** the original Google Fonts links are retained. External font files are not redistributed in the ZIP.

## Style evidence

| Technician | Film | Editorial tag | Evidence |
|---|---|---|---|
| Roger Deakins | Blade Runner 2049 | Atmospheric cinematography | Gaffer Bill O'Leary's ARRI interview: https://www.arri.com/news/news/lighting-blade-runner-2049/ |
| Roger Deakins | Blade Runner 2049 | High-contrast lighting | Deakins interview at the ASC: https://theasc.com/article/uncanny-valley-blade-runner-2049/ |
| Shyju Khalid | Kumbalangi Nights | Naturalistic visuals | Khalid interview, including his work on this film: https://scroll.in/reel/996139/nayattu-cinematographer-shyju-khalid-on-new-malayalam-cinema-the-aesthetic-and-emotions-connect |

These tags describe the cited work and interpretation. They are not measured career-wide characteristics. No style is transferred from one crew member to another. Selecting an unsupported preference such as electronic soundtracks does not invent matching evidence.

## Expansion workflow and limits

The live importer paginates the query service, limits entity batches to 40, pauses between requests, retries transient errors with bounded exponential backoff, and records failed pages with timestamps. A 403 is a permanent access failure, not an instruction to bypass restrictions. Raw normalized page checkpoints are ignored by Git. Upserts preserve existing database IDs through external-ID lookup. Conflicts with matching names but different identifiers stop for review; title/year collisions also stop. No automatic fuzzy merge is allowed.

The implemented mappings are Wikidata P344 (director of photography), P1040 (film editor) and P86 (composer), checked against their property documentation. Production/costume/VFX credits in the starter are separately reviewed statements. Remaining departments are supported by schema/UI but require additional reviewed data sources/mappings. Desired 250+250 films, 1,000 technicians and thousands of credits have **not** been obtained or verified.

Live API importing and hosted administrative uploading remain unverified in this environment. The local network rejected the direct Wikidata entity-data request; the provided retry/parser behavior was tested with controlled responses. Source-backed batch preparation used publicly retrievable source pages. Do not mistake mocked transport tests for a successful bulk ingestion run.
