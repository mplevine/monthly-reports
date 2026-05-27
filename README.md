# BI Monthly Reporting CLI

Generate BI Team leadership report drafts from OneNote on your local machine.

## Prerequisites

- Node.js 20 or newer
- A GitHub token with access to GitHub Models, exported as `GITHUB_TOKEN`
- A configured `monthly-reports.config.json` file with your OneNote and generation settings

## Setup

```bash
npm install
npm run build
```

When you run the CLI, it uses delegated Microsoft authentication to read the configured OneNote notebook and section.

## Commands

```bash
npm run build
npm run report -- --period 2026-05
npm run rerender -- --bundle reports/generated/2026-05/2026-05-27T12-00-00-000Z/source-bundle.json
```

Use `npm run report -- --help` or `node dist/cli.js --help` to print command help.

## Artifacts

Each run writes a timestamped directory under `reports/generated/<period>/` containing:

- `report.md`
- `source-bundle.json`
- `audit-trail.json`

## Development

```bash
npm test
npm run build
```
