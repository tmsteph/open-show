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

## Development Map
- Primary execution plan: [`DEVELOPMENT_MAP.md`](/home/tmsteph/open-show/DEVELOPMENT_MAP.md)
- Current interactive MVP mock: [`mvp/index.html`](/home/tmsteph/open-show/mvp/index.html)
- Vision + architecture page: [`index.html`](/home/tmsteph/open-show/index.html)

## Repo Structure
- `src/app`: application session and orchestration logic.
- `src/engine`: core show runtime and cue state logic.
- `src/adapters`: output/device adapter interfaces and implementations.
