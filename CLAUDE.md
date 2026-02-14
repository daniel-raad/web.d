# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Production build (static export to `out/`)
- `npm run lint` — Run ESLint (extends `next/core-web-vitals`)

## Deployment

Firebase Hosting via GitHub Actions. Pushes to `main` trigger `npm ci && npm run build` then deploy to Firebase project `danielsweb3d`. The static export in `out/` is what gets deployed.

## Architecture

**Next.js 12 personal website** with React 17, using both static generation and client-side Firebase features.

- **Pages** (`pages/`): Next.js file-based routing. `_app.js` wraps all pages in a `Layout` component (which adds a `Footer`). Uses Tailwind CSS + CSS Modules (`.module.css` in `styles/`) + SCSS globals + styled-components.
- **Blog system**: Markdown files in `posts/` parsed with gray-matter + remark. `lib/posts.js` handles reading/parsing. Dynamic routes via `pages/blog/[slug].js` with `getStaticProps`/`getStaticPaths`.
- **Firebase** (`firebase/clientApp.js`): Initializes Firebase Auth, Firestore, and Analytics. `lib/firestore.js` contains Firestore helpers. Used for features like habits tracking (`pages/habits.js`, `components/Habits/`).
- **Components**: Mix of `.js`, `.jsx`, and `.tsx` files. Feature-specific components are grouped in subdirectories (`Chess/`, `Habits/`, `Projects/`).
- **TypeScript**: Partial adoption — `tsconfig.json` exists, Chess components use `.tsx`, but most code is plain JS/JSX.
