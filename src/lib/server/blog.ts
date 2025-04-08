import { marked } from 'marked';
import type { BlogPost } from '../types/blog.js';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Constants for file paths
const WORKSPACE_ROOT = process.cwd();
const POSTS_DIR = path.join(WORKSPACE_ROOT, 'src/content/blog/posts');
const IMAGES_DIR = path.join(WORKSPACE_ROOT, 'src/content/blog/images');

// Load all blog posts from filesystem
export function loadBlogPosts(): BlogPost[] {
  try {
    const files = fs.readdirSync(POSTS_DIR);
    
    const posts = files
      .filter(file => file.toLowerCase().endsWith('.md'))
      .map(file => {
        const slug = file.replace(/\.md$/i, '');
        return loadBlogPost(slug);
      })
      .filter((post): post is BlogPost => post !== null);
    
    return posts.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());
  } catch (error) {
    console.error('Error loading blog posts:', error);
    return [];
  }
}

// Load a single blog post by slug
export function loadBlogPost(slug: string): BlogPost | null {
  try {
    const filePath = path.join(POSTS_DIR, `${slug}.md`);
    let fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // Remove BOM if present
    if (fileContent.charCodeAt(0) === 0xFEFF) {
      fileContent = fileContent.slice(1);
    }
    
    // Parse frontmatter and content
    const { data, content: markdownContent } = matter(fileContent);
    
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
      content: markdownContent,
      summary,
      author: data.author || 'AOK',
      published: data.published || new Date().toISOString().split('T')[0],
      label: data.label || 'Photography',
      image: imageExists ? `/src/content/blog/images/${imageFileName}` : undefined
    };
  } catch (error) {
    console.error(`Error loading blog post ${slug}:`, error);
    return null;
  }
} 