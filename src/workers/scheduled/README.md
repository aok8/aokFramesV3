# Scheduled Image Dimension Extraction Worker

This Cloudflare Worker automatically extracts image dimensions from R2 storage and stores them in KV for efficient retrieval by the website. It runs on a schedule defined in the `wrangler.toml` file.

## How It Works

1. The worker runs on a daily schedule (2:00 AM UTC by default)
2. It automatically determines the current site's URL to call the correct API endpoint
3. When triggered, it calls the `/api/scheduled` endpoint on your SvelteKit application
4. The SvelteKit endpoint handles the actual image processing and KV storage
5. This approach keeps all image processing logic in one place while still having scheduled execution

## Integration with SvelteKit Build

This worker is **automatically deployed with your SvelteKit application**. The process works as follows:

1. The SvelteKit build process runs normally
2. The worker build script (`src/workers/build.js`) copies the worker files to the output directory
3. When Cloudflare Pages deploys your site, it will recognize and deploy the worker as well

## Configuration

You can modify the cron schedule in `wrangler.toml` if you need the worker to run at a different time.

Default schedule: `0 2 * * *` (daily at 2:00 AM UTC)

## Testing & Manual Triggering

After deployment, you can:

1. Check the worker status: Send a GET request to `/workers/scheduled`
2. Manually trigger execution: Send a POST request to `/workers/scheduled/trigger`

## Logs and Monitoring

Worker execution logs can be viewed in the Cloudflare Dashboard:

1. Go to Workers & Pages
2. Select your Pages project
3. Go to the "Functions" tab
4. Find the worker logs under the scheduled worker name

## Benefits Over Standalone Worker

This approach has several advantages:

1. **No URL hardcoding** - The worker automatically determines the correct endpoint URL
2. **Simplified deployment** - The worker is deployed alongside your site, no separate deployment needed
3. **Consolidated code** - All image processing logic stays in the SvelteKit app
4. **Environment consistency** - The worker has access to the same environment bindings as your app 