# OpenShow

Browser-first show control platform for live production workflows.

## Local Development
```bash
npm ci
npm run check
```

Useful commands:
- `npm run lint`: syntax and JSON validity checks.
- `npm run validate:showfile`: validate sample showfile against schema.
- `npm test`: run cue progression tests.
- `npm run check`: run lint + schema validation + tests.
- `npm run start:api`: run local show persistence API (`http://localhost:4173`).

## Local Persistence API
Start the backend:
```bash
npm run start:api
```

Available endpoints:
- `GET /api/health`
- `GET /api/shows`
- `POST /api/shows` (create/update by `metadata.showId`)
- `GET /api/shows/:showId`
- `PUT /api/shows/:showId`
- `DELETE /api/shows/:showId`

The MVP UI now includes `Save to DB` and `Load from DB` actions that target `http://localhost:4173/api/shows` by default.

## Vercel Previews
- Serverless API routes are available at:
  - `/api/health`
  - `/api/shows`
  - `/api/shows/:showId`
- In browser previews, the MVP now defaults to same-origin API calls (for example `https://<preview>.vercel.app/api/shows`).
- Storage on Vercel defaults to in-memory runtime storage unless you configure a persistent backend; data may reset on cold starts/redeploys.

## Development Map
- Primary execution plan: [`DEVELOPMENT_MAP.md`](/home/tmsteph/open-show/DEVELOPMENT_MAP.md)
- Current interactive MVP mock: [`mvp/index.html`](/home/tmsteph/open-show/mvp/index.html)
- Vision + architecture page: [`index.html`](/home/tmsteph/open-show/index.html)

## Repo Structure
- `src/app`: application session and orchestration logic.
- `src/engine`: core show runtime and cue state logic.
- `src/adapters`: output/device adapter interfaces and implementations.
