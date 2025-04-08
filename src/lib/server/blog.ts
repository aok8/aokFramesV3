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
const IMAGES_DIR = dev ? path?.join(WORKSPACE_ROOT, 'src/content/blog/images') : '';

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
    if (dev) {
      // Development mode - use filesystem with async operations
      console.log('Loading blog posts from:', POSTS_DIR);
      const files = await fs.readdir(POSTS_DIR);
      console.log('Found files:', files);
      
      const posts = await Promise.all(
        files
          .filter((file: string) => file.toLowerCase().endsWith('.md'))
          .map(async (file: string) => {
            const slug = file.replace(/\.md$/i, '');
            return await loadBlogPost(slug, platform);
          })
      );
      
      console.log('Loaded posts:', posts.length);
      return posts
        .filter((post: BlogPost | null): post is BlogPost => post !== null)
        .sort((a: BlogPost, b: BlogPost) => new Date(b.published).getTime() - new Date(a.published).getTime());
    } else {
      // Production mode - use R2
      if (!platform?.env?.ASSETSBUCKET) {
        throw new Error('ASSETSBUCKET binding not found');
      }

      const objects = await platform.env.ASSETSBUCKET.list({
        prefix: 'blog/posts/'
      });

      const posts = await Promise.all(
        objects.objects
          .filter((obj: R2Object) => obj.key.toLowerCase().endsWith('.md'))
          .map(async (obj: R2Object) => {
            const slug = obj.key.replace(/^blog\/posts\//, '').replace(/\.md$/i, '');
            return await loadBlogPost(slug, platform);
          })
      );

      return posts
        .filter((post: BlogPost | null): post is BlogPost => post !== null)
        .sort((a: BlogPost, b: BlogPost) => new Date(b.published).getTime() - new Date(a.published).getTime());
    }
  } catch (error) {
    console.error('Error loading blog posts:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : '');
    return [];
  }
}

// Load a single blog post by slug
export async function loadBlogPost(slug: string, platform?: Platform): Promise<BlogPost | null> {
  console.log('Loading blog post with slug:', slug);
  console.log('Development mode:', dev);
  console.log('Posts directory:', POSTS_DIR);
  
  try {
    let fileContent: string;
    let imageExists = false;

    if (dev) {
      // Development mode - use filesystem with async operations
      const filePath = path.join(POSTS_DIR, `${slug}.md`);
      console.log('Attempting to load blog post from:', filePath);
      
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
      
      // Check if image exists
      const imageFileName = `${slug}.jpg`;
      const imagePath = path.join(IMAGES_DIR, imageFileName);
      try {
        await fs.access(imagePath);
        imageExists = true;
        console.log('Image found:', imagePath);
      } catch {
        imageExists = false;
        console.log('No image found at:', imagePath);
      }
    } else {
      // Production mode - use R2
      if (!platform?.env?.ASSETSBUCKET) {
        throw new Error('ASSETSBUCKET binding not found');
      }

      const postObject = await platform.env.ASSETSBUCKET.get(`blog/posts/${slug}.md`);
      if (!postObject) {
        console.error(`Blog post not found: ${slug}`);
        return null;
      }
      fileContent = await postObject.text();

      // Check if image exists
      const imageObject = await platform.env.ASSETSBUCKET.head(`blog/images/${slug}.jpg`);
      imageExists = imageObject !== null;
    }

    // Remove BOM if present
    if (fileContent.charCodeAt(0) === 0xFEFF) {
      fileContent = fileContent.slice(1);
    }
    
    // Parse frontmatter and content
    console.log('Parsing frontmatter and content');
    const { data, content: markdownContent } = matter(fileContent);
    
    // Extract title from first h1
    const titleMatch = markdownContent.match(/^#\s+(.*)/m);
    const title = titleMatch ? titleMatch[1] : slug;
    console.log('Extracted title:', title);
    
    // Extract first paragraph as summary
    const lines = markdownContent.split('\n');
    let summaryLines = [];
    let inSummary = false;
    let hasContent = false;
    
    for (const line of lines) {
      if (!inSummary && line.trim() === '') continue;
      if (line.startsWith('##') || line.startsWith('#')) {
        if (hasContent) break; // Only break if we've found content
        continue;
      }
      inSummary = true;
      if (line.trim() !== '') {
        summaryLines.push(line.trim());
        hasContent = true;
      }
    }
    
    const summary = hasContent ? summaryLines.join(' ') : '';
    console.log('Extracted summary:', summary ? summary.substring(0, 100) + '...' : 'No summary found');
    
    const post = {
      id: slug,
      title,
      content: markdownContent,
      summary,
      author: data.author || 'AOK',
      published: data.published || new Date().toISOString().split('T')[0],
      label: data.label || data.tags || 'Photography', // Add data.tags as fallback
      image: imageExists ? (dev ? `/src/content/blog/images/${slug}.jpg` : `/directr2/blog/images/${slug}.jpg`) : undefined
    };
    
    console.log('Successfully created blog post object:', post.id);
    return post;
  } catch (error) {
    console.error(`Error loading blog post ${slug}:`, error);
    console.error('Stack trace:', error instanceof Error ? error.stack : '');
    return null;
  }
} 