import { writable } from 'svelte/store';
import type { BlogPost } from '../types/blog.js';

// Initialize empty store
export const posts = writable<BlogPost[]>([]); 