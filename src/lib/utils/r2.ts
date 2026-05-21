import { dev } from '$app/environment';

/**
 * Base URL for all R2 assets.
 *
 * Dev  → /directr2  (SvelteKit route + hooks.server.ts emulates R2 from local files)
 * Prod → https://assets.aokframes.com  (Cloudflare CDN in front of R2)
 */
export const R2_BASE = dev ? '/directr2' : 'https://assets.aokframes.com';

/**
 * Build a full URL for an R2 asset key.
 *
 * @param key  R2 object key, with or without a leading slash.
 *             e.g.  "works/colchuk/cover.webp"
 *                   "constants/w1920/bg.webp"
 *                   "portfolio/w1920/photo.webp"
 */
export function assetUrl(key: string): string {
  const clean = key.startsWith('/') ? key.slice(1) : key;
  return `${R2_BASE}/${clean}`;
}
