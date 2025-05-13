import { json } from '@sveltejs/kit';
import { loadWorks } from '$lib/server/works.js';
import type { Work } from '$lib/types/works.js';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ platform, url }) => {
  const verbose = url.searchParams.get('verbose') === 'true';
  const test = url.searchParams.get('test');
  const trace: string[] = [];

  const startTime = Date.now();
  trace.push(`[${Date.now() - startTime}ms] Debug endpoint initiated`);

  // Basic platform check
  const platformExists = !!platform;
  trace.push(`[${Date.now() - startTime}ms] Platform exists: ${platformExists}`);
  
  const r2Available = platform?.env?.ASSETSBUCKET ? true : false;
  trace.push(`[${Date.now() - startTime}ms] R2 available: ${r2Available}`);

  // Get environment info
  const envKeys = platform?.env ? Object.keys(platform.env) : [];
  trace.push(`[${Date.now() - startTime}ms] Environment keys: ${envKeys.join(', ')}`);

  let works: Work[] = [];
  let error: string | null = null;
  
  // Try to load works
  try {
    trace.push(`[${Date.now() - startTime}ms] Attempting to load works...`);
    
    if (test === 'manual') {
      // Manual test of R2 functionality
      trace.push(`[${Date.now() - startTime}ms] Testing R2 with manual operations`);
      
      if (!platform?.env?.ASSETSBUCKET) {
        throw new Error('R2 bucket binding not available');
      }
      
      // Test listing objects
      trace.push(`[${Date.now() - startTime}ms] Listing works/ prefix directly`);
      const listResult = await platform.env.ASSETSBUCKET.list({ prefix: 'works/' });
      trace.push(`[${Date.now() - startTime}ms] List result: ${listResult.objects.length} objects`);
      
      // Check for work structure (folder with index.md)
      const workFolders = new Set<string>();
      listResult.objects.forEach(obj => {
        const parts = obj.key.split('/');
        if (parts.length >= 3 && parts[0] === 'works') {
          workFolders.add(parts[1]);
        }
      });
      
      trace.push(`[${Date.now() - startTime}ms] Found ${workFolders.size} potential work folders`);
      
      // Check if each folder has an index.md
      for (const folder of workFolders) {
        const indexPath = `works/${folder}/index.md`;
        trace.push(`[${Date.now() - startTime}ms] Checking for ${indexPath}`);
        
        const indexObj = await platform.env.ASSETSBUCKET.get(indexPath);
        if (indexObj) {
          trace.push(`[${Date.now() - startTime}ms] Found index.md for ${folder}`);
          const content = await indexObj.text();
          trace.push(`[${Date.now() - startTime}ms] Content length: ${content.length} chars`);
          trace.push(`[${Date.now() - startTime}ms] First 100 chars: ${content.substring(0, 100)}`);
        } else {
          trace.push(`[${Date.now() - startTime}ms] No index.md found for ${folder}`);
        }
      }
    } else {
      // Use normal works loading
      works = await loadWorks(platform);
      trace.push(`[${Date.now() - startTime}ms] Loaded ${works.length} works`);
      
      // Log details of found works
      if (works.length > 0) {
        works.forEach((work, i) => {
          trace.push(`[${Date.now() - startTime}ms] Work ${i+1}: ${work.title} (${work.id}) - ${work.images.length} images`);
        });
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    trace.push(`[${Date.now() - startTime}ms] Error loading works: ${error}`);
  }

  return json({
    timestamp: new Date().toISOString(),
    platform_check: {
      platform_exists: platformExists,
      r2_available: r2Available,
      env_keys: envKeys
    },
    works_count: works.length,
    works: verbose ? works : works.map(w => ({ id: w.id, title: w.title, imageCount: w.images.length })),
    error,
    trace
  });
}; 