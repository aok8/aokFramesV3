# Scheduled Worker for AOK Frames

This Cloudflare Worker handles scheduled tasks for the AOK Frames website. It runs on a cron schedule and calls the image dimension extraction API endpoint in the main SvelteKit application.

## Configuration

Before deploying, update the following values in `index.js`:

1. `TARGET_URL` - Set this to your actual deployed website URL + '/api/scheduled'
2. `AUTH_TOKEN` - Set this to match the authentication token in your SvelteKit endpoint

## Deployment

This worker needs to be deployed separately from your SvelteKit application. Follow these steps:

1. Install Wrangler CLI (if not already installed):
   ```
   npm install -g wrangler
   ```

2. Log in to your Cloudflare account:
   ```
   wrangler login
   ```

3. Customize the cron schedule in `wrangler.toml` if needed (default: daily at 2:00 AM UTC)

4. Deploy the worker:
   ```
   cd workers/scheduled-worker
   wrangler deploy
   ```

## Manual Triggering

You can trigger the scheduled task manually by sending a POST request to the `/trigger` endpoint:

```
curl -X POST https://aokframes-scheduled-worker.your-account.workers.dev/trigger \
  -H "Authorization: Bearer your-secret-token-here" \
  -H "Content-Type: application/json"
```

## Monitoring

You can monitor the worker's execution and logs in the Cloudflare Dashboard:

1. Go to the Cloudflare Dashboard
2. Navigate to Workers & Pages
3. Select your worker
4. View the Logs tab to see execution results and any errors 