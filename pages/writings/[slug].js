import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import Header from '../../components/Header'
import { getAllSlugs, getPostBySlug } from '../../lib/posts'
import { useAuth, getIdToken } from '../../lib/AuthContext'
import styles from '../../styles/BlogPost.module.css'

export async function getStaticPaths() {
  const slugs = await getAllSlugs()
  return {
    paths: slugs.map((slug) => ({ params: { slug } })),
    fallback: 'blocking',
  }
}

export async function getStaticProps({ params }) {
  const post = await getPostBySlug(params.slug)
  if (!post) return { notFound: true }
  return { props: { post } }
}

export default function WritingsPost({ post }) {
  const router = useRouter()
  const { user } = useAuth()

  async function handleDelete() {
    if (!confirm(`Delete "${post.title}"?`)) return
    try {
      const token = await getIdToken()
      await fetch(`/api/blog/${post.slug}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      router.replace('/writings')
    } catch {
      alert('Delete failed')
    }
  }

  if (post.hidden && !user) {
    return (
      <div>
        <Head>
          <title>Not Found — Daniel Raad</title>
          <link rel="icon" href="/astro.png" />
        </Head>
        <Header compact />
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
          This page doesn&apos;t exist.
        </div>
      </div>
    )
  }

  return (
    <div>
      <Head>
        <title>{post.title} — Daniel Raad</title>
        <meta name="description" content={post.excerpt} />
        <link rel="icon" href="/astro.png" />
      </Head>

      <Header compact />

      <article className={styles.container}>
        <Link href="/writings">
          <a className={styles.backLink}>&larr; Back to writings</a>
        </Link>

        <header className={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 className={styles.title}>{post.title}</h1>
            {user && post.source === 'firestore' && (
              <>
                <Link href={`/writings/edit/${post.slug}`}>
                  <a style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.9em',
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                    flexShrink: 0,
                  }} title="Edit post">&#9998;</a>
                </Link>
                <button
                  onClick={handleDelete}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '0.9em',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'color 0.2s',
                    flexShrink: 0,
                  }}
                  title="Delete post"
                >&#128465;</button>
              </>
            )}
          </div>
          <div className={styles.meta}>
            <span className={styles.date}>{post.date}</span>
            {post.tags && (
              <div className={styles.tags}>
                {post.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>{tag}</span>
                ))}
              </div>
            )}
          </div>
        </header>

        <div
          className={styles.content}
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />
      </article>
    </div>
  )
}
