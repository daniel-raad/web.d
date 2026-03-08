import Head from 'next/head'
import Link from 'next/link'
import Header from '../../components/Header'
import BlogList from '../../components/BlogList'
import BlogStreak from '../../components/BlogStreak'
import { getAllPosts } from '../../lib/posts'
import { useAuth } from '../../lib/AuthContext'

export async function getStaticProps() {
  const dailyPosts = await getAllPosts('daily')
  const longformPosts = await getAllPosts('longform')
  const allPosts = await getAllPosts()
  return { props: { dailyPosts, longformPosts, allPosts } }
}

export default function Writings({ dailyPosts, longformPosts, allPosts }) {
  const { user } = useAuth()

  return (
    <div>
      <Head>
        <title>Writings — Daniel Raad</title>
        <meta name="description" content="Daniel Raad's writings" />
        <link rel="icon" href="/astro.png" />
      </Head>

      <Header compact />

      <div className="max-w-2xl mx-auto px-6 pb-10">
        {user && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <Link href="/writings/new">
              <a style={{
                fontSize: '0.85em',
                padding: '0.4rem 1rem',
                borderRadius: '8px',
                background: 'rgba(100, 180, 255, 0.1)',
                border: '1px solid rgba(100, 180, 255, 0.3)',
                color: 'rgba(100, 180, 255, 0.9)',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}>+ New Post</a>
            </Link>
          </div>
        )}
        <BlogStreak posts={allPosts} />
        <BlogList posts={dailyPosts} title="Daily" />
        <BlogList posts={longformPosts} title="Longform" />
      </div>
    </div>
  )
}
