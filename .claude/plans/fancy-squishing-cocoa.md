# Blog: Hybrid Markdown + Firestore with Edit UI

## Context
Blog posts are currently static `.md` files in `posts/daily/` and `posts/longform/`. The AI's `create_blog_post` tool saves to Firestore `blogDrafts` but those never appear on the site. We want to **merge both sources** so all posts show up, and add an **edit button** (when signed in) for Firestore posts.

## Changes

### 1. Update `lib/posts.js` — merge markdown + Firestore posts
- Keep `getPostsFromDir()` unchanged (reads `.md` files)
- Add `getFirestorePosts()` — reads from Firestore `blogPosts` collection
- Make `getAllPosts()`, `getHiddenPosts()`, `getAllSlugs()` async — combine both sources
- Update `getPostBySlug()` to check Firestore if not found in `.md` files
- Firestore posts get `source: 'firestore'`, md posts get `source: 'markdown'`

### 2. Update writing pages for async data
- `pages/writings/index.js` — calls async `getAllPosts()`
- `pages/writings/[slug].js` — calls async `getPostBySlug()`, `getAllSlugs()`
- `pages/writings/hidden.js` — calls async `getHiddenPosts()`

### 3. Add edit icon on `pages/writings/[slug].js`
- Import `useAuth` from `AuthContext`
- If signed in AND `post.source === 'firestore'` → show pencil icon next to title
- Links to `/writings/edit/[slug]`

### 4. Create editor page → `pages/writings/edit/[slug].js`
- Auth-gated (redirect if not signed in)
- Fetches post from Firestore via API
- Form: title, date, excerpt, type, tags, hidden toggle, markdown content textarea
- Live markdown preview
- Save → PUT `/api/blog/[slug]`

### 5. Create new post page → `pages/writings/new.js`
- Same editor UI, for creating posts
- "New Post" button on writings index (only when signed in)
- Save → POST `/api/blog`

### 6. Blog API routes
- `pages/api/blog/index.js` — POST (create, auth required)
- `pages/api/blog/[slug].js` — GET, PUT, DELETE (auth for writes)

### 7. Update `lib/chatEngine.js`
- `create_blog_post` writes to `blogPosts` (not `blogDrafts`)
- Auto-generate slug from title
- Add `source: 'firestore'`

## Files

| File | Action |
|------|--------|
| `lib/posts.js` | Modify |
| `pages/writings/index.js` | Modify |
| `pages/writings/[slug].js` | Modify |
| `pages/writings/hidden.js` | Modify |
| `pages/writings/edit/[slug].js` | Create |
| `pages/writings/new.js` | Create |
| `pages/api/blog/index.js` | Create |
| `pages/api/blog/[slug].js` | Create |
| `lib/chatEngine.js` | Modify |
| `styles/BlogEditor.module.css` | Create |

## Verification
1. Existing `.md` posts still render correctly
2. Create a Firestore post → appears on `/writings`
3. Edit icon shows only on Firestore posts when signed in
4. Editor loads, saves, and preview works
5. `npm run build` succeeds
