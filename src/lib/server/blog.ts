import { marked } from 'marked';
import type { BlogPost } from '../types/blog.js';
import { dev } from '$app/environment';
import matter from 'gray-matter';

// Development-only imports
let fs: any;
let path: any;
if (dev) {
  // Dynamic imports to prevent bundling in production
  const fsPromises = await import('node:fs/promises');
  const pathModule = await import('node:path');
  fs = fsPromises;  // Using fs/promises directly
  path = pathModule.default;
}

// Constants for file paths (development only)
const WORKSPACE_ROOT = dev ? process.cwd() : '';
const POSTS_DIR = dev ? path?.join(WORKSPACE_ROOT, 'src/content/blog/posts') : '';
// Note: IMAGES_DIR is no longer needed as images are co-located

interface Platform {
  env?: {
    ASSETSBUCKET?: {
      list: (options: { prefix: string }) => Promise<{ objects: R2Object[] }>;
      get: (key: string) => Promise<{ text: () => Promise<string> } | null>;
      head: (key: string) => Promise<unknown | null>;
    };
  };
}

interface R2Object {
  key: string;
}

interface FileSystemError extends Error {
  code?: string;
}

// Load all blog posts
export async function loadBlogPosts(platform?: Platform): Promise<BlogPost[]> {
  try {
    console.log('loadBlogPosts: Called. Dev:', dev);
    
    if (dev) {
      // Development mode - Scan subdirectories
      console.log('loadBlogPosts (dev): Scanning directory:', POSTS_DIR);
      if (!fs || !path) throw new Error('FS/Path not loaded in dev');
      
      const entries = await fs.readdir(POSTS_DIR, { withFileTypes: true });
      const postDirs = entries.filter((entry: any) => entry.isDirectory()).map((entry: any) => entry.name);
      console.log('loadBlogPosts (dev): Found potential post directories:', postDirs);
      
      const posts = await Promise.all(
        postDirs.map(async (slug: string) => {
          console.log(`loadBlogPosts (dev): Processing potential slug "${slug}"`);
          try {
            // Check if index.md exists before trying to load
            const mdPath = path.join(POSTS_DIR, slug, 'index.md');
            await fs.access(mdPath); // Throws if not accessible
            return await loadBlogPost(slug, platform);
          } catch (e) {
            // If index.md doesn't exist or other error, skip this directory
            console.warn(`loadBlogPosts (dev): Skipping directory "${slug}", couldn't access index.md or load post. Error:`, e instanceof Error ? e.message : e);
            return null;
          }
        })
      );
      
      console.log('loadBlogPosts (dev): Finished processing directories.');
      // Filter out nulls and sort
      const validPosts = posts
        .filter((post: BlogPost | null): post is BlogPost => post !== null)
        .sort((a: BlogPost, b: BlogPost) => new Date(b.published).getTime() - new Date(a.published).getTime());
      console.log(`loadBlogPosts: Finished. Loaded ${validPosts.length} valid posts from dev mode`);
      return validPosts;
    } else {
      // Production mode - List R2 objects, look for index.md files
      console.log('loadBlogPosts (prod): Listing R2 objects...');
      
      if (!platform?.env?.ASSETSBUCKET) {
        console.error('loadBlogPosts: ASSETSBUCKET binding not available!');
        throw new Error('ASSETSBUCKET binding not found');
      }
      
      console.log('loadBlogPosts (prod): R2 bucket binding present. Attempting list...');
      let objects;
      try {
        const listOptions = { prefix: 'blog/posts/' };
        console.log('loadBlogPosts (prod): Calling R2 list with options:', listOptions);
        objects = await platform.env.ASSETSBUCKET.list(listOptions);
        console.log('loadBlogPosts (prod): R2 list call successful.');
      } catch (r2ListError) {
        console.error('loadBlogPosts: R2 list call FAILED!', r2ListError);
        throw r2ListError; // Re-throw after logging
      }
      
      console.log('loadBlogPosts (prod): R2 list result object count:', objects?.objects?.length ?? 0);
      
      if (!objects || !objects.objects || objects.objects.length === 0) {
        console.log('loadBlogPosts: No blog post objects found in R2.');
        return [];
      }
      
      // Log some basic info about the posts we found
      console.log('loadBlogPosts (prod): First few post keys:', 
        objects.objects.slice(0, 3).map(obj => obj.key));
      
      // Extract unique directory paths (slugs) containing index.md
      const slugs = new Set<string>();
      objects.objects.forEach((obj: R2Object) => {
        if (obj.key.toLowerCase().endsWith('/index.md')) {
          const parts = obj.key.split('/');
          if (parts.length >= 4) { // Expect blog/posts/slug/index.md
             const potentialSlug = parts[parts.length - 2];
             slugs.add(potentialSlug);
          }
        }
      });
      
      const uniqueSlugs = Array.from(slugs);
      console.log('loadBlogPosts (prod): Found potential slugs:', uniqueSlugs);

      const posts = await Promise.all(
        uniqueSlugs.map(async (slug: string) => {
          console.log(`loadBlogPosts (prod): Processing slug "${slug}"`);
          // Add try-catch around individual post loading to prevent one failure from stopping all
          try {
            const post = await loadBlogPost(slug, platform);
            if (!post) {
              console.warn(`loadBlogPosts: loadBlogPost returned null for slug "${slug}"`);
            }
            return post;
          } catch (singlePostError) {
            console.error(`loadBlogPosts: Error loading individual post with slug "${slug}":`, singlePostError);
            return null; // Return null for failed posts
          }
        })
      );

      const validPosts = posts
        .filter((post: BlogPost | null): post is BlogPost => post !== null)
        .sort((a: BlogPost, b: BlogPost) => 
          new Date(b.published).getTime() - new Date(a.published).getTime());
          
      console.log(`loadBlogPosts: Finished. Loaded ${validPosts.length} valid posts from R2`);
      return validPosts;
    }
  } catch (error) {
    console.error('loadBlogPosts: Top-level error:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : '');
    return []; // Return empty array on error
  }
}

// Load a single blog post by slug
export async function loadBlogPost(slug: string, platform?: Platform): Promise<BlogPost | null> {
  console.log(`loadBlogPost: Loading post with slug: "${slug}". Dev: ${dev}`);
  
  try {
    let fileContent: string;
    let imageExists = false;
    const exactSlug = slug; 

    if (dev) {
      // Development mode - Load index.md and check for header.jpg
      const dirPath = path.join(POSTS_DIR, exactSlug);
      const filePath = path.join(dirPath, 'index.md');
      console.log('loadBlogPost (dev): Attempting to load from:', filePath);
      
      try {
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        console.log('File exists:', exists);
        
        if (!exists) {
          console.error(`Blog post file not found: ${filePath}`);
          return null;
        }
        
        fileContent = await fs.readFile(filePath, 'utf-8');
        console.log('Successfully read file content');
      } catch (error) {
        const fsError = error as FileSystemError;
        console.error('Error reading file:', fsError);
        console.error('Error code:', fsError.code);
        if (fsError.code === 'ENOENT') {
          console.error(`Blog post not found: ${slug}`);
          return null;
        }
        throw error;
      }
      
      // Check if header.jpg exists
      const imagePath = path.join(dirPath, 'header.jpg');
      try {
        await fs.access(imagePath);
        imageExists = true;
        console.log('loadBlogPost (dev): Header image found:', imagePath);
      } catch {
        imageExists = false;
        console.log('loadBlogPost (dev): No header image found at:', imagePath);
      }
    } else {
      // Production mode - Load index.md and check for header.jpg from R2
      console.log(`loadBlogPost: Production mode for slug "${exactSlug}". Checking R2 bucket...`);
      if (!platform?.env?.ASSETSBUCKET) {
        console.error(`loadBlogPost: ASSETSBUCKET binding not available for slug "${exactSlug}"!`);
        throw new Error('ASSETSBUCKET binding not found');
      }
      console.log(`loadBlogPost: R2 bucket binding present for slug "${exactSlug}".`);
      
      const r2Key = `blog/posts/${exactSlug}/index.md`;
      console.log(`loadBlogPost: Attempting R2 get for key: "${r2Key}"`);
      let postObject;
      try {
        postObject = await platform.env.ASSETSBUCKET.get(r2Key);
        console.log(`loadBlogPost: R2 get call successful for key "${r2Key}". Object exists: ${!!postObject}`);
      } catch (r2GetError) {
        console.error(`loadBlogPost: R2 get call FAILED for key "${r2Key}"!`, r2GetError);
        throw r2GetError; // Re-throw
      }
      
      if (!postObject) {
        console.warn(`loadBlogPost: R2 get returned null (Not Found) for key "${r2Key}"`);
        return null;
      }
      
      console.log(`loadBlogPost: Attempting to read text content for key "${r2Key}"`);
      try {
        fileContent = await postObject.text();
        console.log(`loadBlogPost: Successfully read text content for key "${r2Key}"`);
      } catch (textError) {
        console.error(`loadBlogPost: Failed to read text content for key "${r2Key}"!`, textError);
        throw textError;
      }
      
      // Check if header.jpg exists
      const imageKey = `blog/posts/${exactSlug}/header.jpg`;
      console.log(`loadBlogPost: Attempting R2 head for image key: "${imageKey}"`);
      let imageObject;
      try {
        imageObject = await platform.env.ASSETSBUCKET.head(imageKey);
        console.log(`loadBlogPost: R2 head call successful for image key "${imageKey}". Object exists: ${!!imageObject}`);
        imageExists = imageObject !== null;
      } catch (r2HeadError) {
        // Log head errors but don't fail the whole post load
        console.warn(`loadBlogPost: R2 head call FAILED for image key "${imageKey}". Assuming image doesn't exist. Error:`, r2HeadError);
        imageExists = false;
      }
    }

    // Remove BOM if present
    if (fileContent.charCodeAt(0) === 0xFEFF) {
      fileContent = fileContent.slice(1);
    }
    
    // Parse frontmatter and content
    console.log('Parsing frontmatter and content');
    const { data, content: markdownContent } = matter(fileContent);
    console.log('Parsed frontmatter:', data);
    
    // Extract title from first h1
    const titleMatch = markdownContent.match(/^#\s+(.*)/m);
    const title = titleMatch ? titleMatch[1] : exactSlug;
    console.log('Extracted title:', title);
    
    // Extract first paragraph as summary
    const lines = markdownContent.split('\n');
    let summaryLines = [];
    let inSummary = false;
    let hasContent = false;
    let foundFirstHeading = false;
    
    for (const line of lines) {
      // Skip until we find the first heading
      if (!foundFirstHeading) {
        if (line.startsWith('#')) {
          foundFirstHeading = true;
        }
        continue;
      }

      // Skip empty lines after title until we find content
      if (!inSummary && line.trim() === '') continue;

      // Stop if we hit another heading
      if (line.startsWith('#')) {
        break;
      }

      inSummary = true;
      const trimmedLine = line.trim();
      if (trimmedLine !== '') {
        summaryLines.push(trimmedLine);
        hasContent = true;
      }
    }
    
    const summary = hasContent ? summaryLines.join(' ') : '';
    console.log('Extracted summary:', summary ? summary.substring(0, 100) + '...' : 'No summary found');
    
    // Get tags from frontmatter
    const tags = data.tags || data.label || 'Photography';
    console.log('Extracted tags:', tags);
    
    // IMPORTANT: Use the exactSlug derived from the filename for the post ID
    // This was previously just `slug`, ensure it reflects the case from storage
    const post = {
      id: exactSlug, // ID is the directory name (slug)
      title,
      content: markdownContent,
      summary,
      author: data.author || 'AOK',
      published: data.published || new Date().toISOString().split('T')[0],
      label: tags,
      image: imageExists ? 
        (dev ? 
          `/src/content/blog/posts/${exactSlug}/header.jpg` : 
          `/directr2/blog/posts/${exactSlug}/header.jpg`
        ) : undefined
    };
    
    console.log(`loadBlogPost: Successfully created object for id: ${post.id}`);
    return post;
  } catch (error) {
    console.error(`loadBlogPost: Top-level error for slug "${slug}":`, error);
    console.error('Stack trace:', error instanceof Error ? error.stack : '');
    return null;
  }
} 