/**
 * Parses frontmatter and content from a markdown string
 * @param {string} content - The raw markdown content with frontmatter
 * @returns {{ data: Record<string, string>, content: string }} Object with frontmatter data and markdown content
 */
export function parseFrontmatter(content) {
  const lines = content.split('\n');
  const frontmatter = /** @type {Record<string, string>} */ ({});
  let inFrontmatter = false;
  let markdownContent = '';
  let frontmatterLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '---') {
      if (!inFrontmatter) {
        inFrontmatter = true;
        continue;
      } else {
        inFrontmatter = false;
        markdownContent = lines.slice(i + 1).join('\n');
        break;
      }
    }
    if (inFrontmatter) {
      frontmatterLines.push(line);
    }
  }

  // Parse frontmatter lines
  for (const line of frontmatterLines) {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      const value = valueParts.join(':').trim();
      // Remove quotes if present
      frontmatter[key.trim()] = value.replace(/^['"](.*)['"]$/, '$1');
    }
  }

  return { data: frontmatter, content: markdownContent };
} 