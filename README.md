# VERIFY Blog - Static Site

## Deployment Instructions

### Cloudflare Pages
1. Push this folder to GitHub repository
2. Connect repository to Cloudflare Pages
3. Build command: (leave empty - static files)
4. Build output directory: /
5. Set custom domain: blog.verify24.pl

### Netlify
1. Push this folder to GitHub repository
2. Connect repository to Netlify
3. Build command: (leave empty - static files)
4. Publish directory: /
5. Set custom domain: blog.verify24.pl

### Manual Upload
1. Upload all files to web hosting
2. Point blog.verify24.pl DNS to hosting
3. Ensure index.html is served as default

## Regenerating Content

Run: `tsx scripts/generateStaticBlog.ts`

This will fetch latest posts from database and regenerate all HTML files.

## Files Structure

- index.html - Blog listing page
- [slug].html - Individual blog posts
- sitemap.xml - SEO sitemap
- robots.txt - Search engine instructions
- _headers - Cloudflare Pages headers
- _redirects - Netlify redirects
