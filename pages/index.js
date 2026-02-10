import Head from 'next/head'
import Header from "../components/Header"
import Description from "../components/Description"
import ProjectList from "../components/Projects/ProjectList"
import BlogList from "../components/BlogList"
import GiscusComments from '../components/GiscusComment';
import { getAllPosts } from '../lib/posts'

export async function getStaticProps() {
  const posts = getAllPosts()
  return { props: { posts } }
}

export default function About({ posts }) {
  return (
    <div>
      <Head>
        <title>Daniel Raad</title>
        <meta name="description" content="Daniel Raad - Personal Website" />
        <link rel="icon" href="/astro.png" />
      </Head>

      <Header/>

      <div className="max-w-2xl mx-auto px-6 pb-10">
        <Description />
        <ProjectList />
        <BlogList posts={posts} />
        <div style={{ marginTop: '2rem' }}>
          <GiscusComments/>
        </div>
      </div>
    </div>
  )
}
