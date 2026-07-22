/**
 * peek-purge — Cloudflare Worker
 *
 * Scheduled cron runs daily at 3 AM UTC. ONLY deletes objects when the
 * ALLOW_AUTO_DELETION secret is set to the string "true" in the Cloudflare
 * dashboard. Without it, the cron run is always a dry-run (logs only).
 *
 * The HTTP fetch handler is what-if mode only — it never deletes, regardless
 * of the ALLOW_AUTO_DELETION flag value or any request payload.
 *
 * Deploy:
 *   cd workers/peek-purge
 *   npx wrangler deploy
 *
 * Enable real deletion (set once in CF dashboard or via CLI):
 *   npx wrangler secret put ALLOW_AUTO_DELETION
 *   > true
 *
 * What-if via HTTP:
 *   POST https://aokframes-peek-purge.<subdomain>.workers.dev
 */

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Scans the temps/ prefix and either deletes or reports old objects.
 * @param {*} env - Worker bindings (R2_BUCKET, ALLOW_AUTO_DELETION)
 * @param {boolean} dryRun - When true, logs but never deletes
 */
async function purge(env, dryRun) {
  const cutoff = new Date(Date.now() - TWO_WEEKS_MS);
  console.log(`[peek-purge] cutoff: ${cutoff.toISOString()} | dryRun: ${dryRun}`);

  let cursor;
  let scanned = 0;
  let deleted = 0;
  const wouldDelete = [];
  const errors = [];

  do {
    const listed = await env.R2_BUCKET.list({
      prefix: 'temps/',
      cursor,
      limit: 500,
    });

    for (const obj of listed.objects) {
      scanned++;
      const uploadedAt = new Date(obj.uploaded);

      if (uploadedAt < cutoff) {
        if (dryRun) {
          wouldDelete.push({
            key: obj.key,
            uploaded: uploadedAt.toISOString(),
            ageMs: Date.now() - uploadedAt.getTime(),
          });
          console.log(`[peek-purge] would delete: ${obj.key} (uploaded ${uploadedAt.toISOString()})`);
        } else {
          try {
            await env.R2_BUCKET.delete(obj.key);
            deleted++;
            console.log(`[peek-purge] deleted: ${obj.key} (uploaded ${uploadedAt.toISOString()})`);
          } catch (err) {
            errors.push({ key: obj.key, error: err.message });
            console.error(`[peek-purge] failed to delete ${obj.key}: ${err.message}`);
          }
        }
      }
    }

    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  return {
    scanned,
    deleted: dryRun ? 0 : deleted,
    wouldDelete: dryRun ? wouldDelete : [],
    errors,
    cutoff: cutoff.toISOString(),
    dryRun,
  };
}

export default {
  /**
   * Cron trigger — only path to real deletion.
   * Deletes only when ALLOW_AUTO_DELETION === "true"; otherwise dry-run.
   */
  async scheduled(_event, env, _ctx) {
    const allowed = env.ALLOW_AUTO_DELETION === 'true';

    if (!allowed) {
      console.log('[peek-purge] ALLOW_AUTO_DELETION is not "true" — running in dry-run mode.');
    }

    const result = await purge(env, !allowed);
    console.log(
      `[peek-purge] done — scanned: ${result.scanned}, deleted: ${result.deleted}, errors: ${result.errors.length}`
    );
  },

  /**
   * HTTP handler — ALWAYS what-if mode. Never deletes regardless of flag or payload.
   */
  async fetch(request, env, _ctx) {
    // Non-POST requests return status info
    if (request.method !== 'POST') {
      const deletionEnabled = env.ALLOW_AUTO_DELETION === 'true';
      return new Response(
        JSON.stringify({
          status: 'ready',
          deletionEnabled,
          message: deletionEnabled
            ? 'Auto-deletion is ENABLED. Cron will delete files older than 14 days.'
            : 'Auto-deletion is DISABLED. Cron will run in dry-run mode until ALLOW_AUTO_DELETION is set to "true".',
          help: 'POST to this endpoint to simulate what would be deleted (what-if only, never deletes).',
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // POST is always what-if — never deletes
    try {
      const result = await purge(env, true);
      return new Response(
        JSON.stringify({
          ...result,
          note: 'This is a what-if preview. No files were deleted. Real deletion only happens via the scheduled cron when ALLOW_AUTO_DELETION is "true".',
        }, null, 2),
        { headers: { 'Content-Type': 'application/json' } }
      );
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
