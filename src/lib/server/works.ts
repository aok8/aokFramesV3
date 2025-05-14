import { marked } from 'marked';
import type { Work } from '../types/works.js';
import { dev } from '$app/environment';
import matter from 'gray-matter';

// Polyfill Buffer for Cloudflare Workers environment
if (typeof Buffer === 'undefined') {
  // @ts-ignore - Intentionally creating a minimal Buffer polyfill for Cloudflare Workers
  globalThis.Buffer = {
    // @ts-ignore - This is a simplified version just for our use case
    from: function(string, encoding) {
      if (encoding === 'base64') return atob(string);
      return string;
    }
  };
}

// Simple frontmatter parser as a fallback for when gray-matter fails
function parseYamlFrontmatter(content: string): { data: Record<string, any>, content: string } {
  try {
    // Match everything between the first two '---' lines
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!frontmatterMatch) return { data: {}, content };
    
    const [, frontmatterStr, contentStr] = frontmatterMatch;
    
    // Parse YAML frontmatter by handling key-value pairs
    const data: Record<string, any> = {};
    const lines = frontmatterStr.split(/\r?\n/);
    
    lines.forEach(line => {
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (!match) return;
      
      const [, key, valueStr] = match;
      let value: any = valueStr.trim();
      
      // Handle quoted strings
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      
      // Handle arrays (simple implementation)
      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          value = JSON.parse(value);
        } catch {
          // If parsing fails, keep as string
          value = value.substring(1, value.length - 1).split(',').map((s: string) => s.trim());
        }
      }
      
      // Handle booleans
      if (value === 'true') value = true;
      if (value === 'false') value = false;
      
      data[key.trim()] = value;
    });
    
    return { data, content: contentStr };
  } catch (e) {
    console.error('Error in fallback frontmatter parser:', e);
    return { data: {}, content };
  }
}

// Parse frontmatter safely, with fallback
function parseFrontmatter(content: string) {
  try {
    // First try gray-matter
    return matter(content);
  } catch (e) {
    console.warn('gray-matter failed, using fallback parser:', e);
    // Fall back to simple parser
    return parseYamlFrontmatter(content);
  }
}

// Development-only imports
let fs: any;
let path: any;
if (dev) {
  // Dynamic imports to prevent bundling in production
  const fsPromises = await import('node:fs/promises');
  const pathModule = await import('node:path');
  fs = fsPromises;
  path = pathModule.default;
}

// Constants for file paths (development only)
const WORKSPACE_ROOT = dev ? process.cwd() : '';
const WORKS_DIR = dev ? path?.join(WORKSPACE_ROOT, 'src/content/works') : '';

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

// Load all works
export async function loadWorks(platform?: Platform): Promise<Work[]> {
  try {
    console.log('loadWorks: Called. Dev:', dev);
    
    if (dev) {
      // Development mode - Scan subdirectories
      console.log('loadWorks (dev): Scanning directory:', WORKS_DIR);
      if (!fs || !path) throw new Error('FS/Path not loaded in dev');
      
      const entries = await fs.readdir(WORKS_DIR, { withFileTypes: true });
      const workDirs = entries.filter((entry: any) => entry.isDirectory()).map((entry: any) => entry.name);
      console.log('loadWorks (dev): Found potential work directories:', workDirs);
      
      const works = await Promise.all(
        workDirs.map(async (slug: string) => {
          console.log(`loadWorks (dev): Processing potential slug "${slug}"`);
          try {
            // Check if index.md exists before trying to load
            const mdPath = path.join(WORKS_DIR, slug, 'index.md');
            await fs.access(mdPath); // Throws if not accessible
            return await loadWork(slug, platform);
          } catch (e) {
            // If index.md doesn't exist or other error, skip this directory
            console.warn(`loadWorks (dev): Skipping directory "${slug}", couldn't access index.md or load work. Error:`, e instanceof Error ? e.message : e);
            return null;
          }
        })
      );
      
      console.log('loadWorks (dev): Finished processing directories.');
      // Filter out nulls and sort
      const validWorks = works
        .filter((work: Work | null): work is Work => work !== null)
        .sort((a: Work, b: Work) => new Date(b.published).getTime() - new Date(a.published).getTime());
      console.log(`loadWorks: Finished. Loaded ${validWorks.length} valid works from dev mode`);
      return validWorks;
    } else {
      // Production mode - List R2 objects, look for index.md files
      console.log('loadWorks (prod): Listing R2 objects...');
      
      if (!platform?.env?.ASSETSBUCKET) {
        console.error('loadWorks: ASSETSBUCKET binding not available!');
        throw new Error('ASSETSBUCKET binding not found');
      }
      
      console.log('loadWorks (prod): R2 bucket binding present. Attempting list...');
      let objects;
      try {
        const listOptions = { prefix: 'works/' };
        console.log('loadWorks (prod): Calling R2 list with options:', listOptions);
        objects = await platform.env.ASSETSBUCKET.list(listOptions);
        console.log('loadWorks (prod): R2 list call successful.');
      } catch (r2ListError) {
        console.error('loadWorks: R2 list call FAILED!', r2ListError);
        throw r2ListError;
      }
      
      console.log('loadWorks (prod): R2 list result object count:', objects?.objects?.length ?? 0);
      
      if (!objects || !objects.objects || objects.objects.length === 0) {
        console.log('loadWorks: No work objects found in R2.');
        return [];
      }
      
      // Log some basic info about the works we found
      console.log('loadWorks (prod): First few work keys:', 
        objects.objects.slice(0, 3).map(obj => obj.key));
      
      // Extract unique directory paths (slugs) containing index.md
      const slugs = new Set<string>();
      objects.objects.forEach((obj: R2Object) => {
        if (obj.key.toLowerCase().endsWith('/index.md')) {
          const parts = obj.key.split('/');
          if (parts.length >= 3) { // Expect works/slug/index.md
             const potentialSlug = parts[parts.length - 2];
             slugs.add(potentialSlug);
          }
        }
      });
      
      const uniqueSlugs = Array.from(slugs);
      console.log('loadWorks (prod): Found potential slugs:', uniqueSlugs);

      const works = await Promise.all(
        uniqueSlugs.map(async (slug: string) => {
          console.log(`loadWorks (prod): Processing slug "${slug}"`);
          try {
            const work = await loadWork(slug, platform);
            if (!work) {
              console.warn(`loadWorks: loadWork returned null for slug "${slug}"`);
            }
            return work;
          } catch (singleWorkError) {
            console.error(`loadWorks: Error loading individual work with slug "${slug}":`, singleWorkError);
            return null;
          }
        })
      );

      const validWorks = works
        .filter((work: Work | null): work is Work => work !== null)
        .sort((a: Work, b: Work) => 
          new Date(b.published).getTime() - new Date(a.published).getTime());
          
      console.log(`loadWorks: Finished. Loaded ${validWorks.length} valid works from R2`);
      return validWorks;
    }
  } catch (error) {
    console.error('loadWorks: Top-level error:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : '');
    return [];
  }
}

// Load a single work by slug
export async function loadWork(slug: string, platform?: Platform): Promise<Work | null> {
  console.log(`loadWork: Loading work with slug: "${slug}". Dev: ${dev}`);
  
  try {
    let fileContent: string;
    let exactSlug = slug;

    if (dev) {
      // Development mode - Load index.md and images
      const dirPath = path.join(WORKS_DIR, exactSlug);
      const filePath = path.join(dirPath, 'index.md');
      console.log('loadWork (dev): Attempting to load from:', filePath);
      
      try {
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        console.log('File exists:', exists);
        
        if (!exists) {
          console.error(`Work file not found: ${filePath}`);
          return null;
        }
        
        fileContent = await fs.readFile(filePath, 'utf-8');
        console.log('Successfully read file content');
      } catch (error) {
        const fsError = error as FileSystemError;
        console.error('Error reading file:', fsError);
        console.error('Error code:', fsError.code);
        if (fsError.code === 'ENOENT') {
          console.error(`Work not found: ${slug}`);
          return null;
        }
        throw error;
      }

      // Parse frontmatter and content
      const { data, content } = parseFrontmatter(fileContent);
      
      // Validate required fields
      if (!data.title || !data.description || !data.published || !data.coverImage) {
        console.error(`loadWork: Missing required fields in frontmatter for "${exactSlug}":`, 
          JSON.stringify({
            title: data.title,
            description: data.description,
            published: data.published,
            coverImage: data.coverImage
          })
        );
      }
      
      // Get list of images in the directory
      const dirContents = await fs.readdir(dirPath);
      const imageFiles = dirContents.filter((file: string) => 
        /\.(jpg|jpeg|png|webp)$/i.test(file) && file !== 'header.webp'
      );

      // Fix cover image path for development mode
      const coverImage = data.coverImage.startsWith('/')
        ? `/directr2/works/${encodeURIComponent(exactSlug)}${data.coverImage}`
        : `/directr2/works/${encodeURIComponent(exactSlug)}/${data.coverImage}`;

      const images = imageFiles.map((file: string) => ({
        src: `/directr2/works/${encodeURIComponent(exactSlug)}/${file}`,
        alt: file.split('.')[0], // Use filename without extension as alt text
        fallback: `/directr2/works/${encodeURIComponent(exactSlug)}/${file}` // Add fallback path
      }));

      return {
        id: exactSlug,
        title: data.title,
        description: data.description,
        published: data.published,
        coverImage,
        nsfw: data.nsfw || false,
        tags: data.tags || [],
        nsfw_tags: data.nsfw_tags || [],
        images
      };
    } else {
      // Production mode - Load from R2
      console.log(`loadWork: Production mode for slug "${exactSlug}". Checking R2 bucket...`);
      if (!platform?.env?.ASSETSBUCKET) {
        console.error(`loadWork: ASSETSBUCKET binding not available for slug "${exactSlug}"!`);
        throw new Error('ASSETSBUCKET binding not available');
      }
      
      const r2Key = `works/${exactSlug}/index.md`;
      console.log(`loadWork: Attempting R2 get for key: "${r2Key}"`);
      let workObject;
      try {
        workObject = await platform.env.ASSETSBUCKET.get(r2Key);
        console.log(`loadWork: R2 get call successful for key "${r2Key}". Object exists: ${!!workObject}`);
      } catch (r2GetError) {
        console.error(`loadWork: R2 get call FAILED for key "${r2Key}"!`, r2GetError);
        throw r2GetError;
      }
      
      if (!workObject) {
        console.warn(`loadWork: R2 get returned null (Not Found) for key "${r2Key}"`);
        return null;
      }
      
      console.log(`loadWork: Attempting to read text content for key "${r2Key}"`);
      try {
        fileContent = await workObject.text();
        console.log(`loadWork: Successfully read text content for key "${r2Key}"`);
      } catch (textError) {
        console.error(`loadWork: Failed to read text content for key "${r2Key}"!`, textError);
        throw textError;
      }

      // Parse frontmatter and content using our safe parser
      console.log(`loadWork: Attempting to parse frontmatter from file content`);
      let data;
      try {
        const parsed = parseFrontmatter(fileContent);
        data = parsed.data;
        console.log(`loadWork: Successfully parsed frontmatter:`, 
          JSON.stringify({
            title: data.title,
            hasDescription: !!data.description, 
            hasPublished: !!data.published,
            hasCoverImage: !!data.coverImage
          })
        );
        
        // Validate required fields
        if (!data.title || !data.description || !data.published || !data.coverImage) {
          console.error(`loadWork: Missing required fields in frontmatter for "${exactSlug}":`, 
            JSON.stringify({
              title: data.title,
              description: data.description,
              published: data.published,
              coverImage: data.coverImage
            })
          );
        }
      } catch (parseError) {
        console.error(`loadWork: Failed to parse frontmatter for "${exactSlug}":`, parseError);
        console.error(`loadWork: Raw file content (first 500 chars): "${fileContent.substring(0, 500)}..."`);
        throw parseError;
      }

      // List all objects in the work's directory to find images
      const imagePrefix = `works/${exactSlug}/`;
      console.log(`loadWork: Listing objects with prefix "${imagePrefix}" to find images...`);
      let listResult;
      try {
        listResult = await platform.env.ASSETSBUCKET.list({
          prefix: imagePrefix
        });
        console.log(`loadWork: Listed ${listResult.objects.length} objects with prefix "${imagePrefix}"`);
        
        if (listResult.objects.length <= 1) { // Only index.md or nothing
          console.warn(`loadWork: Found ${listResult.objects.length} objects for "${exactSlug}" - may be missing images`);
          console.log(`loadWork: Objects: ${JSON.stringify(listResult.objects.map(obj => obj.key))}`);
        }
        
        // Log the first few objects to help debug
        if (listResult.objects.length > 0) {
          console.log(`loadWork: First few object keys: ${JSON.stringify(listResult.objects.slice(0, 3).map(obj => obj.key))}`);
        }
      } catch (listError) {
        console.error(`loadWork: Failed to list objects with prefix "${imagePrefix}"!`, listError);
        throw listError;
      }

      const images = listResult.objects
        .filter(obj => {
          const isImage = /\.(jpg|jpeg|png|webp)$/i.test(obj.key);
          const isNotIndexMd = !obj.key.endsWith('index.md');
          return isImage && isNotIndexMd;
        })
        .map(obj => {
          const imagePath = `/directr2/${obj.key}`;
          console.log(`loadWork: Adding image path: ${imagePath}`);
          return {
            src: imagePath,
            alt: obj.key.split('/').pop()?.split('.')[0] || '' // Use filename without extension as alt text
          };
        });
      
      console.log(`loadWork: Found ${images.length} images for work "${exactSlug}"`);

      const coverImage = data.coverImage.startsWith('/')
        ? `/directr2/works/${encodeURIComponent(exactSlug)}${data.coverImage}`
        : `/directr2/works/${encodeURIComponent(exactSlug)}/${data.coverImage}`;
      
      console.log(`loadWork: Cover image path: "${coverImage}"`);
      
      // Try/catch for work object creation to catch any potential issues
      try {
        const result = {
          id: exactSlug,
          title: data.title,
          description: data.description,
          published: data.published,
          coverImage,
          nsfw: data.nsfw || false,
          tags: data.tags || [],
          nsfw_tags: data.nsfw_tags || [],
          images
        };
        
        console.log(`loadWork: Successfully created work object for "${exactSlug}"`);
        return result;
      } catch (objectError) {
        console.error(`loadWork: Failed to create work object for "${exactSlug}":`, objectError);
        console.error(`loadWork: Data available:`, JSON.stringify({
          id: exactSlug,
          title: data.title?.substring(0, 20),
          hasDescription: !!data.description,
          published: data.published,
          coverImage,
          nsfw: data.nsfw || false,
          tagsCount: data.tags?.length || 0,
          imagesCount: images.length
        }));
        throw objectError;
      }
    }
  } catch (error) {
    console.error(`loadWork: Error loading work "${slug}":`, error);
    return null;
  }
}