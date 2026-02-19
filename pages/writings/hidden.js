import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import Header from '../../components/Header'
import { getHiddenPosts } from '../../lib/posts'
import styles from '../../styles/BlogList.module.css'

export async function getStaticProps() {
  const posts = getHiddenPosts()
  return { props: { posts } }
}

export default function HiddenWritings({ posts }) {
  const router = useRouter()

  if (router.query.secret !== 'danny') {
    return (
      <div>
        <Head>
          <title>Not Found — Daniel Raad</title>
          <link rel="icon" href="/astro.png" />
        </Head>
        <Header compact />
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'rgba(255,255,255,0.5)' }}>
          This page doesn&apos;t exist.
        </div>
      </div>
    )
  }

  return (
    <div>
      <Head>
        <title>Hidden Posts — Daniel Raad</title>
        <link rel="icon" href="/astro.png" />
      </Head>

      <Header compact />

      <div className="max-w-2xl mx-auto px-6 pb-10">
        <div className={styles.section}>
          <h2 className={styles.sectionHeader}>Hidden Posts</h2>
          <div className={styles.grid}>
            {posts.map((post) => (
              <div key={post.slug} className={styles.card}>
                <div className={styles.cardTop}>
                  <h3 className={styles.title}>{post.title}</h3>
                  <span className={styles.date}>{post.date}</span>
                </div>
                <p className={styles.excerpt}>{post.excerpt}</p>
                <div className={styles.links}>
                  <Link href={`/writings/${post.slug}?secret=danny`}>
                    <a className={styles.link}>Read</a>
                  </Link>
                </div>
              </div>
            ))}
          </div>
          {posts.length === 0 && (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>No hidden posts yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
