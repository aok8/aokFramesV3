import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import matter from 'gray-matter';

// Polyfill Buffer for Cloudflare Workers environment
if (typeof Buffer === 'undefined') {
  // @ts-ignore - Intentionally creating a minimal Buffer polyfill for Cloudflare Workers
  globalThis.Buffer = {
    // @ts-ignore - This is a simplified version just for our use case
    from: function(string, encoding) {
      if (encoding === 'base64') return atob(string);
      return string;
    }
  };
}

// Simple frontmatter parser as a fallback when gray-matter fails
function parseYamlFrontmatter(content: string): { data: Record<string, any>, content: string } {
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
function parseFrontmatter(content: string) {
  try {
    // First try gray-matter
    return matter(content);
  } catch (e) {
    console.warn('gray-matter failed, using fallback parser:', e);
    // Fall back to simple parser
    return parseYamlFrontmatter(content);
  }
}

export const GET: RequestHandler = async ({ platform, url }) => {
  // This is the sample content from the debug-indexfiles endpoint
  const sampleContent = `---
title: "Yellowstone"
description: "A collection of images from Yellowstone National Park" 
published: "2023-08-10"
coverImage: "/Ektar100_Mamiya6_08_09_24_4.webp"
tags: ["nature", "film", "national park"]
---

Images from Yellowstone National Park, taken in August 2023.`;

  try {
    // Check if original matter works here
    let matterResult;
    let matterError = null;
    try {
      matterResult = matter(sampleContent);
    } catch (e) {
      matterError = e instanceof Error ? e.message : String(e);
    }

    // Try our custom parser
    let customParserResult;
    let customParserError = null;
    try {
      customParserResult = parseFrontmatter(sampleContent);
    } catch (e) {
      customParserError = e instanceof Error ? e.message : String(e);
    }

    return json({
      original_matter: {
        success: matterError === null,
        error: matterError,
        result: matterResult || null
      },
      custom_parser: {
        success: customParserError === null,
        error: customParserError,
        result: customParserResult || null
      },
      sample_content: sampleContent.substring(0, 150) + "..."
    });
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}; 