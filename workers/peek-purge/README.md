# peek-purge

Cloudflare Worker that automatically deletes images from the `temps/` R2 prefix older than 14 days.

## How deletion is controlled

Real deletion has exactly **two requirements** — both must be true:

1. The Cloudflare secret `ALLOW_AUTO_DELETION` must be set to the string `"true"`
2. The scheduled cron must fire (daily at 3 AM UTC)

There is **no way to trigger real deletion via an HTTP request** to this worker. The `fetch` handler is always what-if mode.

## Enable deletion (production)

Set the secret once in the Cloudflare dashboard, or via CLI:

```bash
cd workers/peek-purge
npx wrangler secret put ALLOW_AUTO_DELETION
# Enter value: true
```

To disable deletion again, set it back to anything other than `"true"`:

```bash
npx wrangler secret put ALLOW_AUTO_DELETION
# Enter value: false
```

## Deploy

```bash
cd workers/peek-purge
npx wrangler deploy
```

## What-if / dry-run (HTTP POST)

POST to the worker URL to see which files *would* be deleted, without deleting anything. This is always safe regardless of the `ALLOW_AUTO_DELETION` flag.

```bash
curl -X POST https://aokframes-peek-purge.<your-subdomain>.workers.dev
```

Response:

```json
{
  "scanned": 22,
  "deleted": 0,
  "wouldDelete": [
    { "key": "temps/photo.webp", "uploaded": "2026-06-01T03:00:00.000Z", "ageMs": 1234567890 }
  ],
  "errors": [],
  "cutoff": "2026-07-07T03:00:00.000Z",
  "dryRun": true,
  "note": "This is a what-if preview. No files were deleted. Real deletion only happens via the scheduled cron when ALLOW_AUTO_DELETION is \"true\"."
}
```

## Status check

```bash
curl https://aokframes-peek-purge.<your-subdomain>.workers.dev
```

Returns whether deletion is currently enabled and a help message.

## Configuration

| Setting | Value |
|---|---|
| R2 bucket | `aokframes-website-assets` |
| Prefix scanned | `temps/` |
| Retention window | 14 days |
| Cron | `0 3 * * *` (3 AM UTC daily) |
| Deletion toggle | `ALLOW_AUTO_DELETION` secret (`"true"` to enable) |
