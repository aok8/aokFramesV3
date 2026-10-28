import matter from 'gray-matter';

/**
 * Frontmatter parsing that survives the Cloudflare runtime.
 *
 * gray-matter leans on Node's Buffer; where the Workers runtime lacks the Node
 * compatibility flag (e.g. a Pages preview deployment whose dashboard settings differ from
 * production) it throws, and every blog post silently fails to load. This shim and the
 * fallback parser below keep posts loading either way.
 */

// Polyfill Buffer for Cloudflare Workers environment
if (typeof Buffer === 'undefined') {
  // @ts-ignore - Intentionally creating a minimal Buffer polyfill for Cloudflare Workers
  globalThis.Buffer = {
    // @ts-ignore - This is a simplified version just for our use case
    from: function(string, encoding) {
      if (encoding === 'base64') return atob(string);
      return string;
    },
    // @ts-ignore
    isBuffer: () => false
  };
}

// Simple frontmatter parser as a fallback for when gray-matter fails
export function parseYamlFrontmatter(content: string): { data: Record<string, any>, content: string } {
  try {
    // Match everything between the first two '---' lines
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!frontmatterMatch) return { data: {}, content };
    
    const [, frontmatterStr, contentStr] = frontmatterMatch;
    
    // Parse YAML frontmatter by handling key-value pairs
    const data: Record<string, any> = {};
    const lines = frontmatterStr.split(/\r?\n/);
    
    lines.forEach(line => {
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (!match) return;
      
      const [, key, valueStr] = match;
      let value: any = valueStr.trim();
      
      // Handle quoted strings
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      
      // Handle arrays (simple implementation)
      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          value = JSON.parse(value);
        } catch {
          // If parsing fails, keep as string
          value = value.substring(1, value.length - 1).split(',').map((s: string) => s.trim());
        }
      }
      
      // Handle booleans
      if (value === 'true') value = true;
      if (value === 'false') value = false;
      
      data[key.trim()] = value;
    });
    
    return { data, content: contentStr };
  } catch (e) {
    console.error('Error in fallback frontmatter parser:', e);
    return { data: {}, content };
  }
}

// Parse frontmatter safely, with fallback
export function parseFrontmatter(content: string) {
  try {
    // First try gray-matter
    return matter(content);
  } catch (e) {
    console.warn('gray-matter failed, using fallback parser:', e);
    // Fall back to simple parser
    return parseYamlFrontmatter(content);
  }
}
