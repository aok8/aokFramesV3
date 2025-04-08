import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types.js';
import { dev } from '$app/environment';
import { get } from 'svelte/store';
import { posts } from '$lib/stores/blog.js';

// Simple frontmatter parser for browser
function parseFrontmatter(content: string) {
  const lines = content.split('\n');
  const frontmatter: Record<string, string> = {};
  let inFrontmatter = false;
  let markdownContent = '';
  let frontmatterLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '---') {
      if (!inFrontmatter) {
        inFrontmatter = true;
        continue;
      } else {
        inFrontmatter = false;
        markdownContent = lines.slice(i + 1).join('\n');
        break;
      }
    }
    if (inFrontmatter) {
      frontmatterLines.push(line);
    }
  }

  // Parse frontmatter lines
  for (const line of frontmatterLines) {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      const value = valueParts.join(':').trim();
      // Remove quotes if present
      frontmatter[key.trim()] = value.replace(/^['"](.*)['"]$/, '$1');
    }
  }

  return { data: frontmatter, content: markdownContent };
}

export const load: PageLoad = async ({ params, fetch }) => {
    const { slug } = params;
    const decodedSlug = decodeURIComponent(slug);
    
    try {
        console.log('=============================================');
        console.log('Attempting to load blog post with slug:', decodedSlug);
        
        // First check if the post is already in the store
        const storedPosts = get(posts);
        console.log('Posts in store:', storedPosts.length);
        
        if (storedPosts.length > 0) {
            console.log('Store post IDs:', storedPosts.map(p => p.id));
            
            // Try case-sensitive first, then try case-insensitive for file extensions
            const storedPost = storedPosts.find(p => p.id === decodedSlug) ||
                              storedPosts.find(p => p.id.toLowerCase() === decodedSlug.toLowerCase());
            
            if (storedPost) {
                console.log('Found post in store:', storedPost.title);
                return { post: storedPost };
            }
        }
        
        // Try to fetch blog status first
        const statusRes = await fetch('/api/blog-status', {
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!statusRes.ok) {
            console.error('Failed to fetch blog status');
            throw error(404, 'Blog post not found');
        }
        
        const statusData = await statusRes.json();
        console.log('Blog R2 status available:', !!statusData);
        console.log('R2 blog posts count:', statusData?.blogPosts?.items?.length || 0);
        
        // In development mode, use the local filesystem path
        if (dev) {
            const postPath = `/src/content/blog/posts/${decodedSlug}.md`;
            console.log('Using development path:', postPath);
            
            const response = await fetch(postPath);
            if (!response.ok) {
                console.error('Failed to load post from filesystem');
                throw error(404, 'Blog post not found');
            }
            
            const text = await response.text();
            console.log('Successfully loaded markdown from filesystem');
            
            // Parse frontmatter and content
            const { data: frontmatter, content: markdownContent } = parseFrontmatter(text);
            console.log('Parsed frontmatter:', frontmatter);
            
            // Extract title from first h1
            const titleMatch = markdownContent.match(/^#\s+(.*)/m);
            const title = titleMatch ? titleMatch[1] : decodedSlug;
            
            // Check if image exists
            const imageKey = `/src/content/blog/images/${decodedSlug}.jpg`;
            const imageResponse = await fetch(imageKey, { method: 'HEAD' });
            const imageExists = imageResponse.ok;
            
            const post = {
                id: decodedSlug,
                title,
                content: markdownContent,
                summary: '', // Summary not needed for full post view
                author: frontmatter.author || 'AOK',
                published: frontmatter.published || new Date().toISOString().split('T')[0],
                label: frontmatter.tags || frontmatter.label || 'Photography',
                image: imageExists ? imageKey : undefined
            };
            
            console.log('Successfully created blog post:', post.title);
            return { post };
        }
        
        // In production mode, find the post in the blog status
        console.log('Searching for post in R2 listing with slug:', decodedSlug);
        
        if (!statusData?.blogPosts?.items) {
            console.error('No blog posts available in R2 status response');
            throw error(404, 'Blog post not found');
        }
        
        // Log all available slugs for debugging
        interface SlugInfo {
            key: string;
            slug: string;
            normalizedSlug: string;
        }

        // Get all available blog post items with metadata
        const availableSlugs: SlugInfo[] = statusData.blogPosts.items.map((item: any) => {
            const filename = item.key.split('/').pop() || '';
            const itemSlug = filename.replace(/\.md$/i, '');
            return {
                key: item.key,
                slug: itemSlug,
                normalizedSlug: itemSlug.toLowerCase().replace(/[^a-z0-9]/g, '')
            };
        });

        console.log('Available slug keys:', availableSlugs.map((i: SlugInfo) => i.key));
        console.log('Available slugs:', availableSlugs.map((i: SlugInfo) => i.slug));
        
        const normalizeSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normalizedDecodedSlug = normalizeSlug(decodedSlug);
        console.log('Normalized searched slug:', normalizedDecodedSlug);
        
        // Try different matching strategies
        
        // 1. First try exact case match
        let postItem = statusData.blogPosts.items.find((item: any) => {
            const filename = item.key.split('/').pop() || '';
            const itemSlug = filename.replace(/\.md$/i, '');
            const exactMatch = itemSlug === decodedSlug;
            if (exactMatch) console.log('Found exact case match for:', itemSlug);
            return exactMatch;
        });
        
        // 2. If no exact match, try case-insensitive match
        if (!postItem) {
            console.log('No exact case match found, trying case-insensitive comparison');
            postItem = statusData.blogPosts.items.find((item: any) => {
                const filename = item.key.split('/').pop() || '';
                const itemSlug = filename.replace(/\.md$/i, '');
                const caseInsensitiveMatch = itemSlug.toLowerCase() === decodedSlug.toLowerCase();
                if (caseInsensitiveMatch) console.log('Found case-insensitive match for:', itemSlug);
                return caseInsensitiveMatch;
            });
        }
        
        // 3. If still no match, try normalized comparison (remove special chars, spaces, etc)
        if (!postItem) {
            console.log('No case-insensitive match found, trying normalized comparison');
            
            // Find the normalized match
            const matchedSlugInfo = availableSlugs.find((item: SlugInfo) => 
                item.normalizedSlug === normalizedDecodedSlug
            );
            
            if (matchedSlugInfo) {
                console.log('Found post with normalized slug comparison:', matchedSlugInfo.slug);
                postItem = statusData.blogPosts.items.find((item: any) => 
                    item.key === matchedSlugInfo.key
                );
            }
        }
        
        // 4. Special case: check if we need to handle capitalization differently
        // Some files might be named "NightPhoto.md" but requested as "nightphoto"
        if (!postItem) {
            console.log('Trying special case for capitalization variations');
            
            // Try all capitalization variations directly from available slugs
            for (const slugInfo of availableSlugs) {
                if (slugInfo.slug.toLowerCase() === decodedSlug.toLowerCase()) {
                    console.log('Found capitalization variation match:', slugInfo.slug);
                    postItem = statusData.blogPosts.items.find((item: any) => 
                        item.key === slugInfo.key
                    );
                    break;
                }
            }
        }
        
        // 5. If still no match, try a more permissive fuzzy match as last resort
        if (!postItem && availableSlugs.length > 0) {
            console.log('No exact or normalized match found, trying fuzzy match');
            
            // Sort by closest match (most characters in common)
            const sortedByCloseness = [...availableSlugs].sort((a, b) => {
                // Count common characters between normalized strings
                const aCommon = [...normalizedDecodedSlug].filter(c => a.normalizedSlug.includes(c)).length;
                const bCommon = [...normalizedDecodedSlug].filter(c => b.normalizedSlug.includes(c)).length;
                return bCommon - aCommon; // Higher number first
            });
            
            if (sortedByCloseness.length > 0) {
                const bestMatch = sortedByCloseness[0];
                // Only use if it's a reasonably good match (>50% characters match)
                if (bestMatch.normalizedSlug.length > 0 && 
                    [...normalizedDecodedSlug].filter(c => bestMatch.normalizedSlug.includes(c)).length / normalizedDecodedSlug.length > 0.5) {
                    
                    console.log('Using fuzzy match:', bestMatch.slug);
                    postItem = statusData.blogPosts.items.find((item: any) => 
                        item.key === bestMatch.key
                    );
                }
            }
        }
        
        if (!postItem) {
            console.error('Blog post not found in R2 listing after all matching attempts');
            throw error(404, 'Blog post not found');
        }
        
        // Direct fetch from R2 using the exact key from the listing
        console.log('Fetching post content from R2 with key:', postItem.key);
        const response = await fetch(`/directr2/${postItem.key}`);
        if (!response.ok) {
            console.error('Failed to load post directly from R2:', response.status);
            throw error(404, 'Blog post not found');
        }
        
        const text = await response.text();
        console.log('Successfully loaded markdown from R2, length:', text.length);
        if (text.length > 0) {
            console.log('First 100 chars:', text.substring(0, 100));
        }
        
        // Parse frontmatter and content
        const { data: frontmatter, content: markdownContent } = parseFrontmatter(text);
        console.log('Parsed frontmatter:', frontmatter);
        
        // Extract title from first h1
        const titleMatch = markdownContent.match(/^#\s+(.*)/m);
        const title = titleMatch ? titleMatch[1] : decodedSlug;
        
        // Extract the filename without extension to use as the slug for the image
        const filename = postItem.key.split('/').pop() || '';
        const itemSlug = filename.replace(/\.md$/i, '');
        
        // Check if image exists
        const imageKey = `blog/images/${itemSlug}.jpg`;
        const imageResponse = await fetch(`/directr2/${imageKey}`, { method: 'HEAD' });
        const imageExists = imageResponse.ok;
        
        const post = {
            id: itemSlug, // Use the EXACT slug from R2 for consistency with the store
            title,
            content: markdownContent,
            summary: '', // Summary not needed for full post view
            author: frontmatter.author || 'AOK',
            published: frontmatter.published || new Date().toISOString().split('T')[0],
            label: frontmatter.tags || frontmatter.label || 'Photography',
            image: imageExists ? `/directr2/${imageKey}` : undefined
        };
        
        console.log('Successfully created blog post from R2:', post.title);
        console.log('Post ID for storage/linking:', post.id);
        console.log('=============================================');
        return { post };
    } catch (e) {
        console.error('Error loading blog post:', e);
        
        // If it's already a SvelteKit error, rethrow it
        if (e && typeof e === 'object' && 'status' in e) {
            throw e;
        }
        
        // Otherwise, wrap it in a 404
        throw error(404, 'Blog post not found');
    }
}; 