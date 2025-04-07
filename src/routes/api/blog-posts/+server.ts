import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import matter from 'gray-matter';
import type { BlogPost } from '$lib/types/blog.js';

interface R2Object {
  key: string;
  size: number;
  etag: string;
  httpEtag: string;
  uploaded: string;
}

interface CloudflareBindings {
  ASSETSBUCKET: {
    list: (options: { prefix: string }) => Promise<{ objects: R2Object[] }>;
    get: (key: string) => Promise<{ text: () => Promise<string> } | null>;
    head: (key: string) => Promise<any | null>;
  };
}

interface Platform {
  env?: CloudflareBindings;
}

export const GET: RequestHandler = async ({ platform }: { platform: Platform }) => {
  try {
    if (!platform?.env?.ASSETSBUCKET) {
      throw new Error('ASSETSBUCKET binding not found');
    }

    // Get list of objects from R2 bucket with 'blog/posts/' prefix
    const objects = await platform.env.ASSETSBUCKET.list({
      prefix: 'blog/posts/'
    });

    // Process each markdown file to extract blog post data
    const posts = await Promise.all(
      objects.objects
        .filter((obj: R2Object) => obj.key.toLowerCase().endsWith('.md'))
        .map(async (obj: R2Object) => {
          try {
            // Get the slug from the filename (without extension)
            const filename = obj.key.split('/').pop() || '';
            const slug = filename.replace(/\.md$/i, '');
            
            // Get the actual markdown content from R2
            const fileObject = await platform.env.ASSETSBUCKET.get(obj.key);
            if (!fileObject) {
              throw new Error(`File not found: ${obj.key}`);
            }
            
            const content = await fileObject.text();
            
            // Parse frontmatter and content
            const { data, content: markdownContent } = matter(content);
            
            // Extract title from first h1
            const titleMatch = markdownContent.match(/^#\s+(.*)/m);
            const title = titleMatch ? titleMatch[1] : 'Untitled';
            
            // Extract first paragraph as summary
            const lines = markdownContent.split('\n');
            let summaryLines = [];
            let inSummary = false;
            
            for (const line of lines) {
              // Skip empty lines before summary
              if (!inSummary && line.trim() === '') continue;
              
              // Stop at subheadings
              if (line.startsWith('##')) break;
              
              // Skip the title
              if (line.startsWith('#')) continue;
              
              // We're now in the summary section
              inSummary = true;
              
              // Add non-empty lines to summary
              if (line.trim() !== '') {
                summaryLines.push(line.trim());
              }
            }
            
            const summary = summaryLines.join(' ');
            
            // Check if a corresponding image exists in blog/images
            const imageKey = `blog/images/${slug}.jpg`;
            const imageExists = (await platform.env.ASSETSBUCKET.head(imageKey)) !== null;
            
            return {
              id: slug,
              title,
              summary,
              content: markdownContent,
              author: data.author || 'AOK',
              published: data.published || new Date(obj.uploaded).toISOString().split('T')[0],
              label: data.label || 'Photography',
              image: imageExists ? `/directr2/${imageKey}` : undefined
            } as BlogPost;
          } catch (error) {
            console.error(`Error processing blog post ${obj.key}:`, error);
            return null;
          }
        })
    );

    // Filter out any null entries and sort by published date
    const validPosts = posts
      .filter((post): post is BlogPost => post !== null)
      .sort((a: BlogPost, b: BlogPost) => new Date(b.published).getTime() - new Date(a.published).getTime());

    return json(validPosts);
  } catch (error) {
    console.error('Error listing R2 blog posts:', error);
    return new Response('Error fetching blog posts', { status: 500 });
  }
} 