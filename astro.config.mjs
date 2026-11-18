// @ts-check
import { defineConfig } from 'astro/config';

// Static build: `astro build` writes plain HTML/CSS/JS to ./dist,
// which Cloudflare Workers serves as static assets (see wrangler.jsonc).
// Server endpoints can be added later without changing hosting.
export default defineConfig({
  site: 'https://kalash-jain.com',
  output: 'static',
});
