import Link from 'next/link'
import BlogStreak from './BlogStreak'
import styles from '../styles/BlogList.module.css'

export default function BlogList({ posts = [] }) {
  if (!posts.length) return null

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionHeader}>Blog</h2>
      <BlogStreak posts={posts} />
      <div className={styles.grid}>
        {posts.map((post) => (
          <div key={post.slug} className={styles.card}>
            <div className={styles.cardTop}>
              <h3 className={styles.title}>{post.title}</h3>
              <span className={styles.date}>{post.date}</span>
            </div>
            <p className={styles.excerpt}>{post.excerpt}</p>
            <div className={styles.links}>
              <Link href={`/blog/${post.slug}`}>
                <a className={styles.link}>Read</a>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
