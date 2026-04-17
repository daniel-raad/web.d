import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Header from '../../components/Header'
import { getAllPosts, getHiddenPosts } from '../../lib/posts'
import { useAuth } from '../../lib/AuthContext'
import styles from '../../styles/Writings.module.css'

export async function getStaticProps() {
  const dailyPosts = await getAllPosts('daily')
  const longformPosts = await getAllPosts('longform')
  const allPosts = await getAllPosts()
  const hiddenPosts = await getHiddenPosts()
  return { props: { dailyPosts, longformPosts, allPosts, hiddenPosts }, revalidate: 60 }
}

export default function Writings({ dailyPosts, longformPosts, allPosts, hiddenPosts }) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('All')

  const visiblePosts = activeTab === 'Hidden' ? hiddenPosts : allPosts

  return (
    <div>
      <Head>
        <title>Writing — Daniel Raad</title>
        <meta name="description" content="Daniel Raad's writings" />
        <link rel="icon" href="/astro.png" />
      </Head>

      <Header compact />

      <div className={styles.layout}>
        {/* Left sidebar */}
        <aside className={styles.sidebar}>
          <nav className={styles.sidebarNav}>
            <span className={styles.sidebarActive}>Writing</span>
            {user && (
              <>
                <button
                  className={`${styles.sidebarLink} ${activeTab === 'Hidden' ? styles.sidebarLinkActive : ''}`}
                  onClick={() => setActiveTab(activeTab === 'Hidden' ? 'All' : 'Hidden')}
                >
                  Hidden
                </button>
                <Link href="/writings/new">
                  <a className={styles.sidebarLink}>+ New Post</a>
                </Link>
              </>
            )}
          </nav>
          <div className={styles.sidebarSection}>
            <button
              className={`${styles.sidebarLink} ${activeTab === 'All' ? styles.sidebarLinkActive : ''}`}
              onClick={() => setActiveTab('All')}
            >
              All <span className={styles.sidebarCount}>{allPosts.length}</span>
            </button>
            <button
              className={`${styles.sidebarLink} ${activeTab === 'Daily' ? styles.sidebarLinkActive : ''}`}
              onClick={() => setActiveTab('Daily')}
            >
              Daily <span className={styles.sidebarCount}>{dailyPosts.length}</span>
            </button>
            <button
              className={`${styles.sidebarLink} ${activeTab === 'Longform' ? styles.sidebarLinkActive : ''}`}
              onClick={() => setActiveTab('Longform')}
            >
              Longform <span className={styles.sidebarCount}>{longformPosts.length}</span>
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className={styles.main}>
          <h1 className={styles.pageTitle}>Writing</h1>

          {(activeTab === 'Daily' ? dailyPosts : activeTab === 'Longform' ? longformPosts : activeTab === 'Hidden' ? hiddenPosts : allPosts).map((post) => (
            <article key={post.slug} className={styles.post}>
              <div className={styles.postMeta}>
                <span>{post.date}</span>
                <span className={styles.metaSep}>&middot;</span>
                <span>{post.type || 'daily'}</span>
                {post.readTime && (
                  <>
                    <span className={styles.metaSep}>&middot;</span>
                    <span>{post.readTime} min read</span>
                  </>
                )}
              </div>
              <h2 className={styles.postTitle}>
                <Link href={`/writings/${post.slug}`}>
                  <a>{post.title}</a>
                </Link>
              </h2>
              {post.excerpt && (
                <p className={styles.postExcerpt}>{post.excerpt}</p>
              )}
            </article>
          ))}

          {visiblePosts.length === 0 && (
            <p className={styles.empty}>No posts yet.</p>
          )}
        </main>

        {/* Right sidebar — table of contents */}
        <aside className={styles.toc}>
          <h3 className={styles.tocTitle}>Table of contents</h3>
          <ul className={styles.tocList}>
            {allPosts.map((post) => (
              <li key={post.slug}>
                <Link href={`/writings/${post.slug}`}>
                  <a className={styles.tocLink}>{post.title}</a>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  )
}
