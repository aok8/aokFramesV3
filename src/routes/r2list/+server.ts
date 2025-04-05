// @ts-ignore - suppress type errors for this diagnostic endpoint
import { json } from '@sveltejs/kit';

// @ts-ignore - suppress type errors for this diagnostic endpoint
export const GET = async (event) => {
  const { platform, url } = event;
  
  try {
    // Basic validation
    if (!platform?.env?.ASSETS) {
      return json({
        error: 'R2 binding not available'
      }, { status: 500 });
    }
    
    const diagnostics = {
      bucket_contents: null as any,
      error: null as string | null,
      prefix: url.searchParams.get('prefix') || ''
    };
    
    // Attempt to list objects in the bucket
    try {
      // Try using list() API
      const listOptions: any = { 
        limit: 1000
      };
      
      if (diagnostics.prefix) {
        listOptions.prefix = diagnostics.prefix;
      }
      
      // @ts-ignore - Expected type mismatch between Cloudflare types 
      const listResult = await platform.env.ASSETS.list(listOptions);
      
      diagnostics.bucket_contents = {
        objects: listResult.objects.map((obj: any) => ({
          key: obj.key,
          size: obj.size,
          uploaded: obj.uploaded?.toISOString()
        })),
        truncated: listResult.truncated || false,
        cursor: listResult.cursor || null
      };
    } catch (listError) {
      // List API failed, try an alternative approach
      diagnostics.error = `List operation failed: ${listError instanceof Error ? listError.message : String(listError)}`;
      
      try {
        // Use custom API to list objects if supported
        // @ts-ignore - Custom API
        const keys = await platform.env.ASSETS.getKeys({
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