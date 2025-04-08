import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { readdir } from 'fs/promises';
import { join } from 'path';

interface R2Object {
  key: string;
  [key: string]: any;
}

interface R2ListResponse {
  objects: R2Object[];
  [key: string]: any;
}

export async function GET({ platform }) {
  try {
    // In development mode, read from local directory
    if (dev) {
      const localPortfolioPath = 'src/images/Portfolio';
      const files = await readdir(localPortfolioPath);
      
      const images = files
        .filter(file => {
          const ext = file.split('.').pop()?.toLowerCase();
          return ['jpg', 'jpeg', 'png'].includes(ext || '');
        })
        .map(file => ({
          url: `/images/portfolio/${file}`,
          fallback: `/src/images/Portfolio/${file}`
        }));

      return json(images);
    }

    // Production mode - use R2 bucket
    if (!platform?.env?.ASSETSBUCKET) {
      throw new Error('ASSETSBUCKET binding not found');
    }

    const objects = await platform.env.ASSETSBUCKET.list({
      prefix: 'portfolio/'
    });

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
    console.error('Error listing images:', error);
    return new Response('Error fetching portfolio images', { status: 500 });
  }
} 