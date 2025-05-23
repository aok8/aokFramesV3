import { describe, it, expect } from 'vitest';
import { cn } from './utils.js';

describe('cn utility function', () => {
  it('combines class names correctly', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('handles conditional classes', () => {
    expect(cn('base', true && 'conditional', false && 'hidden')).toBe('base conditional');
  });

  it('merges Tailwind CSS classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('handles empty and null values', () => {
    expect(cn('', null, undefined, 'valid')).toBe('valid');
  });

  it('handles object syntax', () => {
    expect(cn({
      'active': true,
      'inactive': false,
      'base': true
    })).toBe('active base');
  });
}); 