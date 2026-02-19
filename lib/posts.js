import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import html from 'remark-html'

const postsDirectory = path.join(process.cwd(), 'posts')

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
      const { data } = matter(fileContents)
      return { slug, type, ...data }
    })
}

export function getAllPosts(type) {
  if (type) {
    return getPostsFromDir(type)
      .filter((post) => !post.hidden)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
  }
  const daily = getPostsFromDir('daily')
  const longform = getPostsFromDir('longform')
  return [...daily, ...longform]
    .filter((post) => !post.hidden)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getHiddenPosts() {
  const daily = getPostsFromDir('daily')
  const longform = getPostsFromDir('longform')
  return [...daily, ...longform]
    .filter((post) => post.hidden)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getAllSlugs() {
  const daily = getPostsFromDir('daily')
  const longform = getPostsFromDir('longform')
  return [...daily, ...longform].map(({ slug }) => slug)
}

export async function getPostBySlug(slug) {
  // Search across both directories
  for (const type of ['daily', 'longform']) {
    const fullPath = path.join(postsDirectory, type, `${slug}.md`)
    if (fs.existsSync(fullPath)) {
      const fileContents = fs.readFileSync(fullPath, 'utf8')
      const { data, content } = matter(fileContents)
      const processed = await remark().use(html).process(content)
      const contentHtml = processed.toString()
      return { slug, type, contentHtml, ...data }
    }
  }
  return null
}
