import type { PageServerLoad } from './$types.js';
import { assetUrl } from '$lib/utils/r2.js';
import type { PeekImage } from '$lib/types/peek.js';

export const load: PageServerLoad = async ({ platform }) => {
  try {
    const r2 = (platform as any)?.env?.R2_BUCKET;
		if (!r2) return { images: [], isEmpty: true, loadError: false };

    const listed = await r2.list({ prefix: 'temps/', limit: 500 });
    const imageExts = /\.(webp|jpe?g|png)$/i;

    const images: PeekImage[] = (listed.objects ?? [])
      .filter((obj: any) => imageExts.test(obj.key))
      .sort((a: any, b: any) => new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime())
      .map((obj: any) => ({
        key: obj.key,
        url: assetUrl(obj.key),
				uploaded: new Date(obj.uploaded).toISOString()
      }));

		return { images, isEmpty: images.length === 0, loadError: false };
  } catch {
		return { images: [], isEmpty: true, loadError: true };
  }
};
