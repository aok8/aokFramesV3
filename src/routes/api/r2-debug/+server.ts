import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

interface R2Object {
  key: string;
}

interface R2Bucket {
  list: (options: { prefix: string }) => Promise<{ objects: R2Object[] }>;
  head: (key: string) => Promise<unknown | null>;
}

interface Platform {
  env?: {
    ASSETSBUCKET?: R2Bucket;
  };
}

export const GET: RequestHandler = async ({ platform, url }: { platform?: Platform, url: URL }) => {
  const prefix = url.searchParams.get('prefix') || 'works/';
  
  if (!platform?.env?.ASSETSBUCKET) {
    return json({
      error: 'R2 bucket binding not available',
      platform_exists: !!platform,
      platform_env_exists: !!(platform && platform.env),
      platform_keys: platform ? Object.keys(platform) : [],
      platform_env_keys: platform && platform.env ? Object.keys(platform.env) : []
    }, { status: 500 });
  }
  
  try {
    const bucket = platform.env.ASSETSBUCKET;
    
    // First, let's test a simple head request to make sure the bucket is accessible
    const testKeyResult = await bucket.head('test-key-that-probably-does-not-exist')
      .then(() => ({ success: true }))
      .catch((err: Error) => ({ success: false, error: err.message || String(err) }));
    
    // Now list objects with the requested prefix
    const result = await bucket.list({
      prefix
    });
    
    // Get keys and organize them
    const keys = result.objects.map((obj: R2Object) => obj.key);
    const workFolders = new Set<string>();
    
    // Try to identify work folders
    keys.forEach((key: string) => {
      if (key.startsWith('works/')) {
        const parts = key.split('/');
        if (parts.length >= 3) {
          workFolders.add(parts[1]); // The work slug is the second part
        }
      }
    });
    
    // For each work folder, try to find its index.md
    const workFiles = Array.from(workFolders).map(workSlug => ({
      slug: workSlug,
      indexPath: `works/${workSlug}/index.md`,
      hasIndex: keys.includes(`works/${workSlug}/index.md`),
      imageFiles: keys.filter((key: string) => 
        key.startsWith(`works/${workSlug}/`) && 
        /\.(jpg|jpeg|png|webp)$/i.test(key) &&
        !key.endsWith('/index.md')
      )
    }));
    
    return json({
      r2_test: testKeyResult,
      prefix,
      total_objects: result.objects.length,
      keys: keys.slice(0, 100), // Limit to 100 keys to avoid overwhelming response
      sample_keys: keys.length > 10 ? keys.slice(0, 10) : keys,
      work_folders: Array.from(workFolders),
      work_files: workFiles,
      keys_by_extension: keys.reduce((acc: Record<string, number>, key: string) => {
        const ext = key.split('.').pop()?.toLowerCase() || 'unknown';
        acc[ext] = (acc[ext] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    });
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}; 