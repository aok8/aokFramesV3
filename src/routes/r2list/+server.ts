// @ts-ignore - suppress type errors for this diagnostic endpoint
import { json } from '@sveltejs/kit';

// @ts-ignore - suppress type errors for this diagnostic endpoint
export const GET = async (event) => {
  const { platform, url } = event;
  
  try {
    // Get optional prefix parameter
    const prefix = url.searchParams.get('prefix') || '';
    
    // Basic diagnostics about the environment
    const diagnostics = {
      platform_available: !!platform,
      platform_env_available: !!platform?.env,
      r2_binding_exists: !!platform?.env?.ASSETSBUCKET,
      prefix,
      bucket_contents: null as any,
      error: null as any,
    };
    
    if (!platform?.env) {
      diagnostics.error = 'Platform environment not available';
      return json(diagnostics);
    }
    
    if (!platform.env.ASSETSBUCKET) {
      diagnostics.error = 'R2 binding not available';
      return json(diagnostics);
    }
    
    // Actually try to list the bucket contents
    try {
      const options = {
        limit: 1000,
        prefix
      };
      
      // Try using the R2 list API
      const objects = await platform.env.ASSETSBUCKET.list(options);
      
      // Convert to a simpler format for the response
      diagnostics.bucket_contents = {
        objects: objects.objects.map(obj => ({
          key: obj.key,
          size: obj.size,
          uploaded: obj.uploaded.toISOString(),
          etag: obj.etag
        })),
        truncated: objects.truncated,
        cursor: objects.cursor || null,
        delimitedPrefixes: objects.delimitedPrefixes || []
      };
    } catch (listError) {
      // List API failed, try an alternative approach
      diagnostics.error = `List operation failed: ${listError instanceof Error ? listError.message : String(listError)}`;
      
      try {
        // Use custom API to list objects if supported
        // @ts-ignore - Custom API
        const keys = await platform.env.ASSETSBUCKET.getKeys({
          prefix: diagnostics.prefix,
          limit: 1000
        });
        
        diagnostics.bucket_contents = {
          objects: keys.keys.map((key: string) => ({ key })),
          truncated: keys.truncated || false,
          cursor: keys.cursor || null
        };
      } catch (keysError) {
        // Both approaches failed
        diagnostics.error += `\ngetKeys operation also failed: ${keysError instanceof Error ? keysError.message : String(keysError)}`;
      }
    }
    
    return json(diagnostics);
    
  } catch (error) {
    // Unexpected error
    return json({
      error: 'Unexpected error',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null
    }, { status: 500 });
  }
}; 