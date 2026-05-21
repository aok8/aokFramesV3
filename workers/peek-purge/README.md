# peek-purge

Cloudflare Worker that automatically deletes images from the `temps/` R2 prefix older than 14 days.

## How it works

- Runs daily via cron at **3 AM UTC**
- Lists all objects under `temps/` in R2 (paginated, handles any count)
- Deletes any object whose `uploaded` timestamp is older than 14 days
- Logs each deletion to Cloudflare Worker logs

## Deploy

```bash
cd workers/peek-purge
npx wrangler deploy
```

## Manual trigger / dry-run

Trigger a live run:
```bash
curl -X POST https://aokframes-peek-purge.<your-subdomain>.workers.dev
```

Dry-run (logs what would be deleted without actually deleting):
```bash
curl -X POST https://aokframes-peek-purge.<your-subdomain>.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

Response:
```json
{
  "scanned": 22,
  "deleted": 5,
  "errors": [],
  "cutoff": "2026-05-07T03:00:00.000Z",
  "dryRun": true
}
```

## Configuration

| Setting | Value |
|---|---|
| R2 bucket | `aokframes-website-assets` |
| Prefix scanned | `temps/` |
| Retention window | 14 days |
| Cron | `0 3 * * *` (3 AM UTC daily) |
