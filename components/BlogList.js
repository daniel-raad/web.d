import { useState } from 'react'
import Link from 'next/link'
import { useAuth, getIdToken } from '../lib/AuthContext'
import styles from '../styles/BlogList.module.css'

export default function BlogList({ posts: initialPosts = [], title = 'Blog' }) {
  const { user } = useAuth()
  const [posts, setPosts] = useState(initialPosts)

  async function handleDelete(slug) {
    if (!confirm(`Delete "${slug}"?`)) return
    try {
      const token = await getIdToken()
      const res = await fetch(`/api/blog/${slug}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.slug !== slug))
      } else {
        alert('Delete failed — post may be a markdown file.')
      }
    } catch {
      alert('Delete failed')
    }
  }

  if (!posts.length) return null

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionHeader}>{title}</h2>
      <div className={styles.grid}>
        {posts.map((post) => (
          <div key={post.slug} className={styles.card}>
            <div className={styles.cardTop}>
              <h3 className={styles.title}>{post.title}</h3>
              <span className={styles.date}>{post.date}</span>
            </div>
            <p className={styles.excerpt}>{post.excerpt}</p>
            <div className={styles.links}>
              <Link href={`/writings/${post.slug}`}>
                <a className={styles.link}>Read</a>
              </Link>
              {user && post.source === 'firestore' && (
                <>
                  <Link href={`/writings/edit/${post.slug}`}>
                    <a className={styles.link}>Edit</a>
                  </Link>
                  <button
                    className={styles.deleteLink}
                    onClick={() => handleDelete(post.slug)}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
