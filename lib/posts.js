import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import html from 'remark-html'
import { adminDb } from './firebaseAdmin'

const postsDirectory = path.join(process.cwd(), 'posts')

function estimateReadTime(content) {
  if (!content) return 1
  const words = content.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(words / 250))
}

function getPostsFromDir(type) {
  const dir = path.join(postsDirectory, type)
  if (!fs.existsSync(dir)) return []
  const fileNames = fs.readdirSync(dir)
  return fileNames
    .filter((name) => name.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '')
      const fullPath = path.join(dir, fileName)
      const fileContents = fs.readFileSync(fullPath, 'utf8')
      const { data, content } = matter(fileContents)
      return { slug, type, source: 'markdown', readTime: estimateReadTime(content), ...data }
    })
}

async function getFirestorePosts() {
  try {
    const snap = await adminDb.collection('blogPosts').get()
    return snap.docs.map((doc) => {
      const data = doc.data()
      return {
        slug: data.slug || doc.id,
        title: data.title || '',
        excerpt: data.excerpt || '',
        date: data.date || '',
        tags: data.tags || [],
        type: data.type || 'daily',
        hidden: data.hidden || false,
        source: 'firestore',
      }
    })
  } catch (e) {
    console.error('Failed to fetch Firestore posts:', e.message)
    return []
  }
}

export async function getAllPosts(type) {
  const mdPosts = type ? getPostsFromDir(type) : [...getPostsFromDir('daily'), ...getPostsFromDir('longform')]
  const firestorePosts = await getFirestorePosts()
  const filtered = type
    ? firestorePosts.filter((p) => p.type === type)
    : firestorePosts
  return [...mdPosts, ...filtered]
    .filter((post) => !post.hidden)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

export async function getHiddenPosts() {
  const daily = getPostsFromDir('daily')
  const longform = getPostsFromDir('longform')
  const firestorePosts = await getFirestorePosts()
  return [...daily, ...longform, ...firestorePosts]
    .filter((post) => post.hidden)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

export async function getAllSlugs() {
  const daily = getPostsFromDir('daily')
  const longform = getPostsFromDir('longform')
  const firestorePosts = await getFirestorePosts()
  return [...daily, ...longform, ...firestorePosts].map(({ slug }) => slug)
}

export async function getPostBySlug(slug) {
  // Search markdown files first
  for (const type of ['daily', 'longform']) {
    const fullPath = path.join(postsDirectory, type, `${slug}.md`)
    if (fs.existsSync(fullPath)) {
      const fileContents = fs.readFileSync(fullPath, 'utf8')
      const { data, content } = matter(fileContents)
      const normalised = content.replace(/\u00A0/g, ' ')
      const processed = await remark().use(html).process(normalised)
      const contentHtml = processed.toString()
      return { slug, type, source: 'markdown', contentHtml, ...data }
    }
  }

  // Check Firestore
  try {
    // Try by slug field first
    const snap = await adminDb.collection('blogPosts').where('slug', '==', slug).limit(1).get()
    if (!snap.empty) {
      const doc = snap.docs[0]
      const data = doc.data()
      const normalised = (data.content || '').replace(/\u00A0/g, ' ')
      const processed = await remark().use(html).process(normalised)
      const contentHtml = processed.toString()
      return {
        slug: data.slug || doc.id,
        type: data.type || 'daily',
        source: 'firestore',
        contentHtml,
        title: data.title || '',
        excerpt: data.excerpt || '',
        date: data.date || '',
        tags: data.tags || [],
        hidden: data.hidden || false,
      }
    }

    // Try by document ID
    const docRef = await adminDb.collection('blogPosts').doc(slug).get()
    if (docRef.exists) {
      const data = docRef.data()
      const normalised = (data.content || '').replace(/\u00A0/g, ' ')
      const processed = await remark().use(html).process(normalised)
      const contentHtml = processed.toString()
      return {
        slug,
        type: data.type || 'daily',
        source: 'firestore',
        contentHtml,
        title: data.title || '',
        excerpt: data.excerpt || '',
        date: data.date || '',
        tags: data.tags || [],
        hidden: data.hidden || false,
      }
    }
  } catch (e) {
    console.error('Firestore lookup failed:', e.message)
  }

  return null
}
