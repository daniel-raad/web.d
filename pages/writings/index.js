import Head from 'next/head'
import Header from '../../components/Header'
import BlogList from '../../components/BlogList'
import BlogStreak from '../../components/BlogStreak'
import { getAllPosts } from '../../lib/posts'

export async function getStaticProps() {
  const dailyPosts = getAllPosts('daily')
  const longformPosts = getAllPosts('longform')
  const allPosts = getAllPosts()
  return { props: { dailyPosts, longformPosts, allPosts } }
}

export default function Writings({ dailyPosts, longformPosts, allPosts }) {
  return (
    <div>
      <Head>
        <title>Writings — Daniel Raad</title>
        <meta name="description" content="Daniel Raad's writings" />
        <link rel="icon" href="/astro.png" />
      </Head>

      <Header compact />

      <div className="max-w-2xl mx-auto px-6 pb-10">
        <BlogStreak posts={allPosts} />
        <BlogList posts={dailyPosts} title="Daily" />
        <BlogList posts={longformPosts} title="Longform" />
      </div>
    </div>
  )
}
