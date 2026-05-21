/**
 * peek-purge — Cloudflare Worker
 *
 * Runs daily at 3 AM UTC. Deletes any object under the `temps/` prefix
 * in R2 that was uploaded more than 14 days ago.
 *
 * Deploy:
 *   cd workers/peek-purge
 *   npx wrangler deploy
 *
 * Test locally (dry-run flag):
 *   POST /trigger  { "dryRun": true }
 */

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

async function purge(env, dryRun = false) {
  const cutoff = new Date(Date.now() - TWO_WEEKS_MS);
  console.log(`[peek-purge] cutoff: ${cutoff.toISOString()} | dryRun: ${dryRun}`);

  let cursor;
  let scanned = 0;
  let deleted = 0;
  const errors = [];

  do {
    const listed = await env.R2_BUCKET.list({
      prefix: 'temps/',
      cursor,
      limit: 500,
    });

    for (const obj of listed.objects) {
      scanned++;
      const age = new Date(obj.uploaded);

      if (age < cutoff) {
        if (!dryRun) {
          try {
            await env.R2_BUCKET.delete(obj.key);
            deleted++;
            console.log(`[peek-purge] deleted: ${obj.key} (uploaded ${age.toISOString()})`);
          } catch (err) {
            errors.push({ key: obj.key, error: err.message });
            console.error(`[peek-purge] failed to delete ${obj.key}: ${err.message}`);
          }
        } else {
          deleted++;
          console.log(`[peek-purge] dry-run would delete: ${obj.key} (uploaded ${age.toISOString()})`);
        }
      }
    }

    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  return { scanned, deleted, errors, cutoff: cutoff.toISOString(), dryRun };
}

export default {
  // Cron trigger — runs on schedule
  async scheduled(_event, env, _ctx) {
    const result = await purge(env, false);
    console.log(
      `[peek-purge] done — scanned: ${result.scanned}, deleted: ${result.deleted}, errors: ${result.errors.length}`
    );
  },

  // HTTP handler — allows manual trigger + dry-run from Cloudflare dashboard or curl
  async fetch(request, env, _ctx) {
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({
          status: 'ready',
          message: 'POST to /trigger to run manually. Add { "dryRun": true } to preview without deleting.',
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    let dryRun = false;
    try {
      const body = await request.json();
      dryRun = body?.dryRun === true;
    } catch {
      // no body or invalid JSON — that's fine, default to live run
    }

    try {
      const result = await purge(env, dryRun);
      return new Response(JSON.stringify(result, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
