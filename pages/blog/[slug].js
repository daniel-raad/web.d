import Head from 'next/head'
import Link from 'next/link'
import Header from '../../components/Header'
import { getAllSlugs, getPostBySlug } from '../../lib/posts'
import styles from '../../styles/BlogPost.module.css'

export async function getStaticPaths() {
  const slugs = getAllSlugs()
  return {
    paths: slugs.map((slug) => ({ params: { slug } })),
    fallback: false,
  }
}

export async function getStaticProps({ params }) {
  const post = await getPostBySlug(params.slug)
  return { props: { post } }
}

export default function BlogPost({ post }) {
  return (
    <div>
      <Head>
        <title>{post.title} — Daniel Raad</title>
        <meta name="description" content={post.excerpt} />
        <link rel="icon" href="/astro.png" />
      </Head>

      <Header />

      <article className={styles.container}>
        <Link href="/">
          <a className={styles.backLink}>&larr; Back</a>
        </Link>

        <header className={styles.header}>
          <h1 className={styles.title}>{post.title}</h1>
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
