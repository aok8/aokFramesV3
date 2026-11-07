import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

/**
 * Date of the newest upload on Peek (the temps/ folder), for the footer's "Last roll developed".
 * Listing the bucket on every page view would be wasteful, so the answer is kept in memory for
 * ten minutes per worker instance and browsers may reuse it for the same time.
 */
const TTL_MS = 10 * 60 * 1000;
let cached: { at: number; body: { lastRoll: string | null } } | null = null;

export const GET: RequestHandler = async ({ platform }) => {
	const headers = { 'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600' };
	if (cached && Date.now() - cached.at < TTL_MS) return json(cached.body, { headers });

	try {
		const r2 = (platform as any)?.env?.R2_BUCKET;
		if (!r2) return json({ lastRoll: null }, { headers });

		const listed = await r2.list({ prefix: 'temps/', limit: 500 });
		let newest = 0;
		for (const obj of listed.objects ?? []) {
			if (!/\.(webp|jpe?g|png)$/i.test(obj.key)) continue;
			const t = new Date(obj.uploaded).getTime();
			if (t > newest) newest = t;
		}
		const body = { lastRoll: newest ? new Date(newest).toISOString() : null };
		cached = { at: Date.now(), body };
		return json(body, { headers });
	} catch {
		return json({ lastRoll: null }, { headers: { 'Cache-Control': 'no-store' } });
	}
};
