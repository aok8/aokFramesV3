import { error } from '@sveltejs/kit';
import { posts } from '$lib/stores/blog.js';
import { get } from 'svelte/store';
import matter from 'gray-matter';
import type { BlogPost } from '$lib/types/blog.js';

export const load = async ({ params, fetch }: { params: { slug: string }, fetch: (input: RequestInfo, init?: RequestInit) => Promise<Response> }) => {
  // First, check if we already have the post in the store
  const storedPosts = get(posts);
  const postFromStore = storedPosts.find(post => post.id === params.slug);
  
  if (postFromStore) {
    console.log('Found post in store:', postFromStore.id);
    return { post: postFromStore };
  }
  
  console.log('Post not found in store, attempting direct fetch');
  
  // If not in store, try to fetch directly from R2
  try {
    // First get bucket info to determine paths
    const statusRes = await fetch('/api/blog-status');
    if (!statusRes.ok) {
      throw error(404, { message: 'Could not get bucket status' });
    }
    
    const statusData = await statusRes.json();
    console.log('Blog R2 status for single post:', statusData);
    
    // Find the post key with matching slug
    const postItem = statusData.blogPosts.items.find((item: { key: string }) => {
      const filename = item.key.split('/').pop();
      const slug = filename?.replace(/\.md$/i, '') || '';
      return slug === params.slug;
    });
    
    if (!postItem) {
      throw error(404, { message: 'Blog post not found in bucket' });
    }
    
    // Fetch the markdown content directly
    console.log(`Fetching blog post directly from /directr2/${postItem.key}`);
    const mdResponse = await fetch(`/directr2/${postItem.key}`);
    
    if (!mdResponse.ok) {
      throw error(404, { message: 'Blog post markdown could not be fetched' });
    }
    
    const mdContent = await mdResponse.text();
    console.log(`Successfully fetched markdown for ${params.slug}`);
    
    // Parse frontmatter and content
    const { data, content: markdownContent } = matter(mdContent);
    
    // Extract title from first h1
    const titleMatch = markdownContent.match(/^#\s+(.*)/m);
    const title = titleMatch ? titleMatch[1] : params.slug;
    
    // Extract first paragraph as summary
    const lines = markdownContent.split('\n');
    let summaryLines: string[] = [];
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
    
    // Check if a matching image exists in the status data
    const hasMatchingImage = statusData.matching?.postsWithImages?.includes(params.slug);
    
    const post: BlogPost = {
      id: params.slug,
      title,
      summary,
      content: markdownContent,
      author: data.author || 'AOK',
      published: data.published || new Date().toISOString().split('T')[0],
      label: data.label || 'Photography',
      image: hasMatchingImage ? `/directr2/blog/images/${params.slug}.jpg` : undefined
    };
    
    console.log('Constructed post from direct fetch:', post.id);
    return { post };
  } catch (e) {
    console.error('Error loading blog post:', e);
    throw error(404, { message: 'Post not found' });
  }
}; 