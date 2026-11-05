# BD Transit V2 — Automatic OSM Transport Map

## What is actually implemented
- Additive Neon migration (`neon/auto-map-migration.sql`) creates `transport_points` and `import_runs`. Run **after** existing `neon/schema.sql`.
- `/map` interactive Leaflet/OpenStreetMap map, search/filter, bounded API `/api/map/points`.
- Authenticated Vercel daily cron `/api/cron/sync-osm` (03:00 UTC) imports OSM bus stops, bus stations, railway stations and halts. It uses one bounded geographic tile per day, 25 tiles in a rolling cycle, and upserts by OSM ID.
- All imported data has OSM source links. It is not marked as a verified commercial route, fare, timetable, or live vehicle position.

## Setup
1. Back up your existing Neon database. Execute `neon/auto-map-migration.sql` in Neon SQL Editor (production/neondb). No destructive SQL is included.
2. Upload the contents of this ZIP (not ZIP itself) into your GitHub repo root. Keep your existing Vercel environment variables.
3. Set `CRON_SECRET` to a locally generated random 32-byte hex string in Vercel Production environment variables. Never publish it.
4. Deploy to Vercel Production. The cron schedule is configured in `vercel.json`. It runs at 03:00 UTC daily; imported coverage grows gradually over 25 days. Failed tiles retry on their next rotation, unless manually retried with authenticated invocation.
5. Visit `/map`. If it is empty initially, this is expected until cron succeeds. In Vercel Settings > Cron Jobs inspect executions and logs.

## Limitations and production considerations
- No single authorized nationwide API for all Bangladesh bus and train service routes, fares, schedules or live GPS is integrated. The existing verified route and fare tables remain unchanged.
- OSM contains mapping errors and incomplete coverage. Imported features are explicitly labeled as OSM geographic features.
- Public Overpass servers have capacity/usage limits. This bounded daily sync is a starter, **not a guaranteed nationwide bulk ingestion service**. For reliable full-country imports use the [Geofabrik Bangladesh PBF](https://download.geofabrik.de/asia/bangladesh.html) processed by a dedicated worker (not a Vercel function) or a licensed commercial data feed. Coordinate with provider policies and ODbL obligations.
- The cron endpoint has a 60-second maximum duration, aborts slow Overpass requests, and may fail or import partially if database writes take too long. Failed syncs are recorded in `import_runs` and are not silently represented as complete. It does not delete old OSM records, and a long-lived production system should reconcile deletions and keep freshness timestamps visible.
- Leaflet CSS/JS is loaded from a CDN. Map tiles use OSM public tiles with attribution; high-traffic production sites should contract a compliant tile provider, honor caching, attribution and OSM tile usage policy. No tile bulk download.
- Imported station positions do **not** prove that a particular passenger train serves them; imported bus stops do **not** prove a bus operator or fare. Verified train/bus schedules require separate authorized feeds. No fake GPS is generated.
- Existing admin password reset uses `scripts/create-admin.mjs` and must be done privately; never commit passwords, secrets or `.env.local`.

## API
`GET /api/map/points?kind=railway_station&south=22&north=25&west=89&east=92&q=Dhaka`
Returns up to 1,000 real imported OSM points with source links. Query params are bounded and sanitized.
