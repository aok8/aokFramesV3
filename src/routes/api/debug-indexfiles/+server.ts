import { json } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import matter from 'gray-matter';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ platform, url }) => {
  // Check if we have platform access
  if (!platform?.env?.ASSETSBUCKET) {
    throw error(500, { message: 'R2 bucket not available' });
  }
  
  // Get the slug parameter or default to all works
  const slug = url.searchParams.get('slug');
  
  if (slug) {
    // Get a specific work's index.md
    return await getWorkIndexFile(platform, slug);
  } else {
    // List all works and their index.md files
    return await listAllWorkIndexFiles(platform);
  }
};

async function getWorkIndexFile(platform, slug) {
  try {
    const key = `works/${slug}/index.md`;
    console.log(`Attempting to get: ${key}`);
    
    const object = await platform.env.ASSETSBUCKET.get(key);
    
    if (!object) {
      return json({
        success: false,
        error: `File not found: ${key}`
      }, { status: 404 });
    }
    
    const content = await object.text();
    
    // Try to parse frontmatter
    try {
      const parsed = matter(content);
      
      return json({
        success: true,
        key,
        content: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
        frontmatter: parsed.data,
        content_length: content.length,
        has_valid_frontmatter: parsed.data && typeof parsed.data === 'object',
        required_fields: {
          has_title: !!parsed.data.title,
          has_description: !!parsed.data.description,
          has_published: !!parsed.data.published,
          has_coverImage: !!parsed.data.coverImage
        }
      });
    } catch (parseError) {
      return json({
        success: false,
        key,
        content: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
        error: `Failed to parse frontmatter: ${parseError.message}`,
        content_length: content.length
      });
    }
  } catch (err) {
    return json({
      success: false,
      error: `Error retrieving or processing file: ${err.message}`
    }, { status: 500 });
  }
}

async function listAllWorkIndexFiles(platform) {
  try {
    // List all objects with works/ prefix
    const objects = await platform.env.ASSETSBUCKET.list({ prefix: 'works/' });
    
    // Find all index.md files
    const indexFiles = objects.objects.filter(obj => obj.key.endsWith('/index.md'));
    
    // Get slugs from keys
    const workSlugs = indexFiles.map(file => {
      const parts = file.key.split('/');
      return parts.length >= 3 ? parts[1] : null;
    }).filter(Boolean);
    
    // Process each work
    const workDetails = await Promise.all(
      workSlugs.map(async (slug) => {
        try {
          const key = `works/${slug}/index.md`;
          const object = await platform.env.ASSETSBUCKET.get(key);
          
          if (!object) {
            return {
              slug,
              success: false,
              error: 'File not found'
            };
          }
          
          const content = await object.text();
          
          try {
            // Parse frontmatter
            const parsed = matter(content);
            
            return {
              slug,
              success: true,
              frontmatter: parsed.data,
              content_length: content.length,
              has_valid_frontmatter: parsed.data && typeof parsed.data === 'object',
              required_fields: {
                has_title: !!parsed.data.title,
                has_description: !!parsed.data.description,
                has_published: !!parsed.data.published,
                has_coverImage: !!parsed.data.coverImage
              }
            };
          } catch (parseError) {
            return {
              slug,
              success: false,
              error: `Failed to parse frontmatter: ${parseError.message}`,
              content_preview: content.substring(0, 100) + (content.length > 100 ? '...' : '')
            };
          }
        } catch (err) {
          return {
            slug,
            success: false,
            error: `Error processing file: ${err.message}`
          };
        }
      })
    );
    
    return json({
      success: true,
      work_count: workSlugs.length,
      works: workDetails
    });
  } catch (err) {
    return json({
      success: false,
      error: `Error listing works: ${err.message}`
    }, { status: 500 });
  }
} 