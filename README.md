# kalash-jain.com

Personal portfolio of Kalash Jain. Built with [Astro](https://astro.build) as a static site and served by Cloudflare Workers (static assets).

## Develop

```bash
npm install
npm run dev        # http://localhost:4321
```

## Build and deploy

```bash
npm run build      # static files in ./dist
npm run preview    # build, then serve through Wrangler like production
npm run deploy     # manual deploy (normally Cloudflare deploys on every push to main)
```

Cloudflare settings live in `wrangler.jsonc`. To add server endpoints later (newsletter, AI demos), add a Worker `main` entry there; the static pages stay as they are.
