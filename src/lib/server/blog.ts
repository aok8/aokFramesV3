import { marked } from 'marked';
import type { BlogPost } from '../types/blog.js';
import fs from 'fs';
import path from 'path';

// Use absolute paths from workspace root
const WORKSPACE_ROOT = process.cwd();
const POSTS_DIR = path.join(WORKSPACE_ROOT, 'src/content/blog/posts');
const IMAGES_DIR = path.join(WORKSPACE_ROOT, 'src/content/blog/images');

export function loadBlogPost(slug: string): BlogPost | null {
  try {
    const filePath = path.join(POSTS_DIR, `${slug}.md`);
    console.log('Loading blog post from:', filePath);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Remove BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
      console.log('BOM detected, removing...');
      content = content.slice(1);
    }
    
    // Debug content
    console.log('Content encoding check:');
    console.log('- First char code:', content.charCodeAt(0));
    console.log('- First few chars:', content.slice(0, 10).split('').map(c => c.charCodeAt(0)));
    console.log('First few lines of content:', content.split('\n').slice(0, 3));
    console.log('Content starts with #:', content.startsWith('#'));
    console.log('First line:', JSON.stringify(content.split('\n')[0]));
    
    // Extract title from first h1
    const titleMatch = content.match(/^#\s+(.*)/m);
    console.log('Title match:', titleMatch);
    const title = titleMatch ? titleMatch[1] : 'Untitled';
    console.log('Extracted title:', title);
    
    // Extract first paragraph after title but before any subheadings
    const lines = content.split('\n');
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
    console.log('Extracted summary:', summary);
    
    // Check for matching image
    const imageFileName = `${slug}.jpg`;
    const imagePath = path.join(IMAGES_DIR, imageFileName);
    const image = fs.existsSync(imagePath) ? `/src/content/blog/images/${imageFileName}` : undefined;
    
    // Use file stats for published date
    const stats = fs.statSync(filePath);
    
    const post = {
      id: slug,
      title,
      summary,
      content,
      author: 'AOK', // Could be extracted from frontmatter if added
      published: stats.mtime.toISOString().split('T')[0],
      label: 'Photography', // Could be extracted from frontmatter if added
      image
    };
    
    console.log('Loaded post:', post);
    return post;
  } catch (e) {
    console.error(`Error loading blog post ${slug}:`, e);
    return null;
  }
}

export function loadAllBlogPosts(): BlogPost[] {
  try {
    console.log('Loading posts from directory:', POSTS_DIR);
    const files = fs.readdirSync(POSTS_DIR);
    console.log('Found files:', files);
    
    const posts = files
      .filter(file => file.toLowerCase().endsWith('.md'))
      .map(file => {
        // Get slug from filename without extension, preserving original case
        const slug = file.slice(0, -3);
        console.log('Processing file:', file, 'with slug:', slug);
        const post = loadBlogPost(slug);
        return post;
      })
      .filter((post): post is BlogPost => post !== null)
      .sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());
    
    console.log('Loaded posts:', posts);
    return posts;
  } catch (e) {
    console.error('Error loading blog posts:', e);
    return [];
  }
} 