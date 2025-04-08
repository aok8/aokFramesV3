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
async function getDevBlogPosts(): Promise<BlogPost[]> {
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
}

// Main function to get blog posts based on environment
export async function getBlogPosts(): Promise<BlogPost[]> {
  if (dev) {
    const response = await fetch('/api/blog-posts');
    if (!response.ok) {
      console.error('Failed to fetch blog posts:', response.status);
      return [];
    }
    return response.json();
  }
  
  // Production - fetch from R2
  try {
    console.log('Fetching blog posts from production API');
    
    // Direct fetch approach using /directr2/ path
    try {
      const statusResponse = await fetch('/api/blog-status', {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log('Blog status data:', statusData);
        
        if (statusData.blogPosts?.items?.length > 0) {
          const posts: BlogPost[] = [];
          
          // Process each blog post from status data
          for (const item of statusData.blogPosts.items) {
            try {
              const key = item.key;
              const filename = key.split('/').pop() || '';
              const slug = filename.replace(/\.md$/i, '');
              console.log(`Attempting to fetch blog post: ${slug} from /directr2/${key}`);
              
              // Direct fetch of the markdown content
              const mdResponse = await fetch(`/directr2/${key}`, {
                headers: {
                  'Cache-Control': 'no-cache'
                }
              });
              
              if (mdResponse.ok) {
                const mdContent = await mdResponse.text();
                console.log(`Successfully fetched markdown for ${slug}`);
                
                // Parse frontmatter and content
                const { data, content: markdownContent } = matter(mdContent);
                
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
                
                // Check if a matching image exists in the status data
                const hasMatchingImage = statusData.matching?.postsWithImages?.includes(slug);
                
                posts.push({
                  id: slug,
                  title,
                  summary,
                  content: markdownContent,
                  author: data.author || 'AOK',
                  published: data.published || new Date().toISOString().split('T')[0],
                  label: data.label || 'Photography',
                  image: hasMatchingImage ? `/directr2/blog/images/${slug}.jpg` : undefined
                });
              } else {
                console.warn(`Failed to fetch markdown for ${slug}: ${mdResponse.status}`);
              }
            } catch (e) {
              console.error(`Error processing blog post:`, e);
            }
          }
          
          if (posts.length > 0) {
            console.log(`Successfully loaded ${posts.length} posts via direct fetch`);
            // Sort by published date (newest first)
            return posts.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());
          }
        }
      }
    } catch (err) {
      console.error('Error using direct blog post fetch approach:', err);
    }
    
    // Fallback to API endpoints
    try {
      console.log('Falling back to API endpoints for blog posts');
      const endpoints = ['/api/blog-posts', '/blog-posts'];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Attempting to fetch from ${endpoint}`);
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
    } catch (err) {
      console.error('Error using API fallback for blog posts:', err);
    }
    
    return []; // Return empty array if all methods fail
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return [];
  }
}

// Get a specific blog post by slug
export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  if (dev) {
    const response = await fetch(`/api/blog-posts/${slug}`);
    if (!response.ok) {
      console.error('Failed to fetch blog post:', response.status);
      return null;
    }
    return response.json();
  }
  
  // Production - fetch from R2
  try {
    const response = await fetch(`/directr2/blog/posts/${slug}.md`);
    if (!response.ok) {
      return null;
    }

    const content = await response.text();
    const lines = content.split('\n');
    let frontmatter: Record<string, string> = {};
    let markdownContent = '';
    let inFrontmatter = false;
    let firstParagraph = '';
    let foundTitle = false;
    let title = '';

    for (const line of lines) {
      if (line.trim() === '---') {
        inFrontmatter = !inFrontmatter;
        continue;
      }

      if (inFrontmatter) {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length) {
          frontmatter[key.trim()] = valueParts.join(':').trim();
        }
      } else {
        markdownContent += line + '\n';

        // Extract title and first paragraph
        if (!title && line.startsWith('#')) {
          title = line.replace(/^#\s+/, '').trim();
          foundTitle = true;
        } else if (!firstParagraph && foundTitle && line.trim() !== '') {
          firstParagraph = line.trim();
        }
      }
    }

    // Check if an image exists
    const imageResponse = await fetch(`/directr2/blog/images/${slug}.jpg`);
    const hasImage = imageResponse.ok;

    return {
      id: slug,
      title: title || slug,
      content: markdownContent,
      summary: firstParagraph,
      author: frontmatter.author || 'AOK',
      published: frontmatter.published || new Date().toISOString().split('T')[0],
      label: frontmatter.label || 'Photography',
      image: hasImage ? `/directr2/blog/images/${slug}.jpg` : undefined
    };
  } catch (e) {
    console.error('Error getting blog post:', e);
    return null;
  }
} 