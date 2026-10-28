import { describe, it, expect } from 'vitest';
import { parseFrontmatter, parseYamlFrontmatter } from './frontmatter.js';

const post = '---\r\nauthor: AOK\r\npublished: 2024-04-03\r\nlabel: "Photography/Story"\r\n---\r\n# Title\r\n\r\nBody';

describe('frontmatter', () => {
	it('fallback parser reads a post the way gray-matter would', () => {
		const { data, content } = parseYamlFrontmatter(post);
		expect(data.author).toBe('AOK');
		expect(data.label).toBe('Photography/Story');
		expect(String(data.published)).toContain('2024-04-03');
		expect(content.startsWith('# Title')).toBe(true);
	});

	it('returns content untouched when there is no frontmatter', () => {
		expect(parseYamlFrontmatter('# Just a heading').data).toEqual({});
		expect(parseFrontmatter('# Just a heading').content).toBe('# Just a heading');
	});

	it('main parser and fallback agree on the fields the blog uses', () => {
		const a = parseFrontmatter(post).data;
		const b = parseYamlFrontmatter(post).data;
		expect(a.author).toBe(b.author);
		expect(a.label).toBe(b.label);
	});
});
