import type { Work } from '$lib/types/works.js';

export interface LayoutData {
  works: Work[];
  r2Available: boolean;
  error?: string;
  layoutStatus?: 'skipped-work-load' | 'loaded' | 'api-fallback' | 'error';
}

export interface PageData {
  works: Work[];
} 