import { json } from '@sveltejs/kit';

interface R2Object {
  key: string;
  [key: string]: any;
}

interface R2ListResponse {
  objects: R2Object[];
  [key: string]: any;
}

export async function GET() {
  try {
    // Get list of objects from R2 bucket
    const objects = await (process.env.R2_BUCKET as any).list({
      prefix: 'portfolio/'
    }) as R2ListResponse;

    // Filter for image files and map to required format
    const images = objects.objects
      .filter((obj: R2Object) => {
        const ext = obj.key.split('.').pop()?.toLowerCase();
        return ['jpg', 'jpeg', 'png'].includes(ext || '');
      })
      .map((obj: R2Object) => ({
        url: `/directr2/${obj.key}`,
        fallback: `/images/${obj.key.replace('portfolio/', 'portfolio/')}`
      }));

    return json(images);
  } catch (error) {
    console.error('Error listing R2 objects:', error);
    return new Response('Error fetching portfolio images', { status: 500 });
  }
} 