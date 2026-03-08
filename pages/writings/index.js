import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Header from '../../components/Header'
import BlogList from '../../components/BlogList'
import BlogStreak from '../../components/BlogStreak'
import { getAllPosts, getHiddenPosts } from '../../lib/posts'
import { useAuth } from '../../lib/AuthContext'

export async function getStaticProps() {
  const dailyPosts = await getAllPosts('daily')
  const longformPosts = await getAllPosts('longform')
  const allPosts = await getAllPosts()
  const hiddenPosts = await getHiddenPosts()
  return { props: { dailyPosts, longformPosts, allPosts, hiddenPosts }, revalidate: 60 }
}

const tabs = ['All', 'Hidden']

export default function Writings({ dailyPosts, longformPosts, allPosts, hiddenPosts }) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('All')

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    fontSize: '0.85em',
                    padding: '0.4rem 1rem',
                    borderRadius: '8px',
                    background: activeTab === tab ? 'rgba(100, 180, 255, 0.2)' : 'transparent',
                    border: activeTab === tab ? '1px solid rgba(100, 180, 255, 0.4)' : '1px solid rgba(255,255,255,0.1)',
                    color: activeTab === tab ? 'rgba(100, 180, 255, 0.9)' : 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >{tab}</button>
              ))}
            </div>
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

        {activeTab === 'All' ? (
          <>
            <BlogStreak posts={allPosts} />
            <BlogList posts={dailyPosts} title="Daily" />
            <BlogList posts={longformPosts} title="Longform" />
          </>
        ) : (
          <>
            <BlogList posts={hiddenPosts} title="Hidden" />
            {hiddenPosts.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>No hidden posts yet.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
