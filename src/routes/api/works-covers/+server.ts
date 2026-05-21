import { json } from '@sveltejs/kit';
import { loadWorks } from '$lib/server/works.js';
import type { RequestHandler } from './$types.js';

/**
 * Returns just the cover image URL and id for every work.
 * Used by the Preloader to warm the browser cache before the user
 * navigates to /works, so hover previews are instant.
 */
export const GET: RequestHandler = async ({ platform }) => {
  try {
    const works = await loadWorks(platform as any);

    const covers = works
      .filter((w) => w.coverImage)
      .map((w) => ({ id: w.id, coverImage: w.coverImage }));

    return json(covers, {
      headers: {
        // Short-lived CDN cache — works list rarely changes
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60'
      }
    });
  } catch {
    return json([], { status: 200 });
  }
};
