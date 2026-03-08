import Head from 'next/head'
import Link from 'next/link'
import Header from '../../components/Header'
import { getAllSlugs, getPostBySlug } from '../../lib/posts'
import { useAuth } from '../../lib/AuthContext'
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
  const { user } = useAuth()

  if (post.hidden && !user) {
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
        <title>{post.title} — Daniel Raad</title>
        <meta name="description" content={post.excerpt} />
        <link rel="icon" href="/astro.png" />
      </Head>

      <Header compact />

      <article className={styles.container}>
        <Link href="/writings">
          <a style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: '0.85em',
            textDecoration: 'none',
            transition: 'color 0.2s',
            display: 'inline-block',
            marginBottom: '1.5rem',
          }}>&larr; Back to writings</a>
        </Link>

        <header className={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 className={styles.title}>{post.title}</h1>
            {user && post.source === 'firestore' && (
              <Link href={`/writings/edit/${post.slug}`}>
                <a style={{
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '0.9em',
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                  flexShrink: 0,
                }} title="Edit post">&#9998;</a>
              </Link>
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
