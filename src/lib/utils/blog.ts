import type { BlogPost } from '../types/blog.js';

// Main function to get blog posts
export async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const response = await fetch('/api/blog-posts');
    if (!response.ok) {
      console.error('Failed to fetch blog posts:', response.status);
      return [];
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return [];
  }
}

// Get a single blog post
export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const response = await fetch(`/api/blog-posts/${slug}`);
    if (!response.ok) {
      console.error(`Failed to fetch blog post ${slug}:`, response.status);
      return null;
    }
    return response.json();
  } catch (error) {
    console.error(`Error fetching blog post ${slug}:`, error);
    return null;
  }
} 