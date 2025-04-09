# Blog System Debugging Guide

## Understanding the Blog Structure

The blog system uses a folder-based approach where each blog post has its own directory:

```
src/content/blog/posts/
  └── post-slug/
      ├── index.md     # Main post content with frontmatter
      ├── header.jpg   # Header image (optional)
      └── image1.jpg   # Other post images referenced in content (optional)
```

## Common Issues

### 1. Blog Post Not Found on Direct Load/Refresh

If blog posts load fine when navigating from the blog list page but return "Not Found" when accessed directly or on page refresh, check:

- **Server-Side Loading:** The `+page.server.ts` file in `src/routes/blog/[slug]/` should be loading posts correctly in both development and production.
- **Module Imports:** Ensure `loadBlogPost` and other utility functions are properly imported.
- **Path Structure:** Confirm all path references use the current folder structure (`/blog/posts/{slug}/` NOT `/blog/images/{slug}.jpg`).

### 2. Missing Header Images

If header images aren't displaying:

- **Paths:** Ensure header images are being referenced as `header.jpg` within each post's directory.
- **Hook Handler:** The server hooks in `src/hooks.server.ts` should be mapping `/directr2/blog/{slug}/header.jpg` to the correct R2 object or local file.
- **Image Checks:** The code checks for header images by making HEAD requests to test existence. Check browser network tab to see if these requests are succeeding.

### 3. R2 Integration

If the system works in development but not production:

- **R2 Access:** Confirm the R2 bucket is properly configured and accessible.
- **Error Handling:** Check the server hooks are correctly handling R2 not-found errors with 404 responses.
- **Key Format:** Ensure R2 objects use the same path structure as your local files.

## Key Files

- `src/lib/server/blog.ts` - Contains `loadBlogPost` and `loadBlogPosts` functions
- `src/hooks.server.ts` - Intercepts requests to `/directr2/` and maps them to R2 or local files
- `src/routes/blog/[slug]/+page.server.ts` - Server-side loading for individual blog posts
- `src/routes/blog/[slug]/+page.ts` - Client-side loading for blog posts
- `src/routes/blog/[slug]/+page.svelte` - The blog post page component with fallback client-side loading

## Testing Changes

1. **Development Mode:**
   - Blog posts should load from `src/content/blog/posts/{slug}/`
   - Images should be served from `src/content/blog/posts/{slug}/header.jpg`

2. **Production Mode:**
   - Blog posts should load from R2 bucket at key `blog/posts/{slug}/index.md`
   - Images should be served from R2 bucket at key `blog/posts/{slug}/header.jpg`
   - Direct URLs should work: `https://yourdomain.com/blog/post-slug`

## File Structure Requirements

Ensure R2 bucket objects follow this structure:
```
blog/posts/night-photo/index.md
blog/posts/night-photo/header.jpg
```

And local development files follow this structure:
```
src/content/blog/posts/night-photo/index.md
src/content/blog/posts/night-photo/header.jpg
``` 