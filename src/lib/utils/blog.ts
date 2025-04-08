import { dev } from '$app/environment';
import type { BlogPost } from '../types/blog.js';
import matter from 'gray-matter';
import fs from 'fs';
import path from 'path';

interface BlogPostWithImage extends BlogPost {
  localImagePath?: string;
}

// Constants for file paths
const POSTS_DIR = 'src/content/blog/posts';
const IMAGES_DIR = 'src/content/blog/images';

// For development environment - load posts from local filesystem
const getDevBlogPosts = async (): Promise<BlogPost[]> => {
  try {
    // Read directory contents using fs instead of fetch
    const files = fs.readdirSync(POSTS_DIR);
    
    // Process each markdown file
    const posts = files
      .filter(file => file.toLowerCase().endsWith('.md'))
      .map(file => {
        try {
          // Get slug from filename
          const slug = file.replace(/\.md$/i, '');
          
          // Read file content
          const filePath = path.join(POSTS_DIR, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          
          // Parse frontmatter and content
          const { data, content: markdownContent } = matter(content);
          
          // Extract title from first h1
          const titleMatch = markdownContent.match(/^#\s+(.*)/m);
          const title = titleMatch ? titleMatch[1] : slug;
          
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
          
          // Check if image exists
          const imageFileName = `${slug}.jpg`;
          const imagePath = path.join(IMAGES_DIR, imageFileName);
          const imageExists = fs.existsSync(imagePath);
          
          return {
            id: slug,
            title,
            summary,
            content: markdownContent,
            author: data.author || 'AOK',
            published: data.published || new Date().toISOString().split('T')[0],
            label: data.label || 'Photography',
            image: imageExists ? `/src/content/blog/images/${imageFileName}` : undefined
          } as BlogPost;
        } catch (error) {
          console.error(`Error processing dev blog post ${file}:`, error);
          return null;
        }
      })
      .filter((post): post is BlogPost => post !== null);
    
    // Sort by published date (newest first)
    return posts.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());
  } catch (error) {
    console.error('Error loading dev blog posts:', error);
    return [];
  }
};

// For production environment - fetch from R2 via API
const getProdBlogPosts = async (): Promise<BlogPost[]> => {
  try {
    console.log('Fetching blog posts from production API');
    
    // First check status endpoint to verify R2 bucket status
    try {
      const statusResponse = await fetch('/api/blog-status', {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log('R2 bucket status:', statusData.status);
        console.log('Blog posts available:', statusData.blogPosts?.count || 0);
        
        // If status indicates no posts, return early
        if (!statusData.blogPosts?.count) {
          console.log('No blog posts found in R2 bucket');
          return [];
        }
        
        // If status shows posts available, try all configured direct loading methods
        if (statusData.blogPosts?.count > 0) {
          // Use the actual post keys from the status response to directly construct posts
          const manuallyConstructedPosts = statusData.blogPosts.items.map((item: {key: string; uploaded?: string | number | Date}) => {
            const key = item.key;
            const filename = key.split('/').pop() || '';
            const slug = filename.replace(/\.md$/i, '');
            
            // Check if a matching image exists in the status data
            const hasMatchingImage = statusData.matching.postsWithImages.includes(slug);
            
            return {
              id: slug,
              title: slug, // Will be replaced by actual content if we can fetch it
              summary: 'Loading...',
              content: '',
              author: 'AOK',
              published: item.uploaded ? new Date(item.uploaded).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              label: 'Photography',
              image: hasMatchingImage ? `/directr2/blog/images/${slug}.jpg` : undefined
            } as BlogPost;
          });
          
          console.log('Constructed basic posts from status data, now attempting to fetch full content');
          
          // Attempt to load full post content for each post
          const endpoints = [
            '/api/blog-posts',
            '/blog-posts'
          ];
          
          for (const endpoint of endpoints) {
            try {
              console.log(`Attempting to fetch posts from ${endpoint}`);
              const response = await fetch(endpoint, {
                headers: {
                  'Accept': 'application/json',
                  'Cache-Control': 'no-cache'
                }
              });
              
              if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data) && data.length > 0) {
                  console.log(`Successfully fetched ${data.length} posts from ${endpoint}`);
                  return data;
                }
              }
            } catch (e) {
              console.error(`Error fetching from ${endpoint}:`, e);
            }
          }
          
          // If all endpoints failed but we have basic post info from status, return those
          console.log('Could not fetch detailed posts, returning basic information');
          return manuallyConstructedPosts;
        }
      }
    } catch (error) {
      console.error('Error checking blog status:', error);
      // Continue with normal fetch attempts even if status check fails
    }
    
    // Attempt normal API endpoints as a fallback
    const endpoints = [
      '/api/blog-posts',
      '/blog-posts'
    ];
    
    let response = null;
    let error = null;
    
    // Try each endpoint until one works
    for (const endpoint of endpoints) {
      try {
        console.log(`Attempting to fetch from ${endpoint}`);
        const fetchResponse = await fetch(endpoint, {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (fetchResponse.ok) {
          response = fetchResponse;
          console.log(`Successfully fetched from ${endpoint}`);
          break;
        } else {
          console.log(`Failed to fetch from ${endpoint}: ${fetchResponse.status} ${fetchResponse.statusText}`);
        }
      } catch (e) {
        error = e;
        console.error(`Error fetching from ${endpoint}:`, e);
      }
    }
    
    if (!response) {
      if (error) throw error;
      throw new Error('All API endpoints failed');
    }
    
    const data = await response.json();
    console.log('Received blog posts data:', JSON.stringify(data).substring(0, 100) + '...');
    
    // If data is not an array, it might be an error response or invalid format
    if (!Array.isArray(data)) {
      console.error('Received invalid data format. Expected array but got:', typeof data);
      return [];
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return []; // In production, don't fallback to dev posts
  }
};

// Get a specific blog post by slug
export const getBlogPost = async (slug: string): Promise<BlogPost | null> => {
  const posts = await getBlogPosts();
  return posts.find(post => post.id === slug) || null;
};

// Main function to get blog posts based on environment
export const getBlogPosts = async (): Promise<BlogPost[]> => {
  if (dev) {
    return getDevBlogPosts();
  }
  return getProdBlogPosts();
}; 