# Chormokar Admin

Admin dashboard for the Chormokar storefront.

Built with Next.js (App Router), React 19, TypeScript and Tailwind CSS. The app talks to the
Chormokar backend API and provides tools for orders, products, categories, inventory,
promotions, banners, blog content, customers, support and store settings.

## Requirements

- Node.js 22+
- npm (a pnpm lockfile is also present)
- A running Chormokar backend API

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

The dashboard runs on [http://localhost:3001](http://localhost:3001).

## Environment

Copy `.env.example` to `.env.local` and set:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Backend API base URL, e.g. `https://api.chormokar.com/api/v1` |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | Public media/CDN base URL |
| `NEXT_PUBLIC_STOREFRONT_URL` | Storefront origin used for preview links |
| `INTERNAL_API_URL` | Server-to-server API URL (optional) |
| `REVALIDATE_SECRET` | Shared secret for storefront cache revalidation |

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server on port 3001 |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run typecheck` | TypeScript checks |
| `npm run lint` | Oxlint |

## Branding

The Chormokar palette and logo assets live in:

- `src/app/globals.css` — colour tokens (leather, parchment, cognac, brass)
- `public/images/brand/` — logo mark, full badge and email lockup
- `public/favicon.*`, `src/app/icon.png`, `src/app/apple-icon.png` — icons

## Deployment

A multi-stage `Dockerfile` and `docker-compose.prod.yml` are included. The app is also
compatible with PM2 via `ecosystem.config.cjs` and with Vercel (set the project root to this
repository).
