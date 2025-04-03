import { marked } from 'marked';
import type { BlogPost } from '../types/blog.js';
import fs from 'fs';
import path from 'path';

const POSTS_DIR = 'src/content/blog/posts';
const IMAGES_DIR = 'src/content/blog/images';

export function loadBlogPost(slug: string): BlogPost | null {
  try {
    const filePath = path.join(POSTS_DIR, `${slug}.md`);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Extract title from first h1
    const titleMatch = content.match(/^# (.*)/m);
    const title = titleMatch ? titleMatch[1] : 'Untitled';
    
    // Extract first paragraph as summary
    const paragraphs = content.split('\n\n');
    const summary = paragraphs.find(p => !p.startsWith('#'))?.replace(/\n/g, ' ') || '';
    
    // Check for matching image
    const imageFileName = `${slug}.jpg`;
    const imagePath = path.join(IMAGES_DIR, imageFileName);
    const image = fs.existsSync(imagePath) ? `/src/content/blog/images/${imageFileName}` : undefined;
    
    // Use file stats for published date
    const stats = fs.statSync(filePath);
    
    return {
      id: slug,
      title,
      summary,
      content,
      author: 'AOK', // Could be extracted from frontmatter if added
      published: stats.mtime.toISOString().split('T')[0],
      label: 'Photography', // Could be extracted from frontmatter if added
      image
    };
  } catch (e) {
    console.error(`Error loading blog post ${slug}:`, e);
    return null;
  }
}

export function loadAllBlogPosts(): BlogPost[] {
  try {
    const files = fs.readdirSync(POSTS_DIR);
    return files
      .filter(file => file.endsWith('.md'))
      .map(file => {
        const slug = file.replace('.md', '');
        const post = loadBlogPost(slug);
        return post;
      })
      .filter((post): post is BlogPost => post !== null)
      .sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());
  } catch (e) {
    console.error('Error loading blog posts:', e);
    return [];
  }
} 