import Head from 'next/head'
import Avatar from '../components/Avatar'
import { PostCard, Categories, PostWidget } from '../components/'
import BlogHeader from '../components/BlogHeader'
import { getPosts } from '../services'


export default function Life({ posts }) {
  return (
    <div className="container mx-auto px-10 mb-8">
      <Head>
        <title>All about you</title>
        <meta name="description" content="Hello you <3" />
        <link rel="icon" href="/NinjaEmoji.jpeg" />
      </Head>
      <BlogHeader />
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-12 mb-20'>
        <div className="lg:col-span-8 col-span-1">
          {posts.map((post) => <PostCard post={post.node} key={post.title}/>)}
        </div>
        <div className="lg:col-span-4 col-span-1">
            <div className="lg:sticky relative top-8">
              <PostWidget />
              <Categories /> 
            </div>
        </div>
      </div>

    </div>
  )
}

export async function getStaticProps() { 
  const posts = (await getPosts()) || [];

  return {
    props: { posts }
  }
}
