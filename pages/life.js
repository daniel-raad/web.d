import Head from 'next/head'
import Avatar from '../components/Avatar'
import { PostCard, Categories, PostWidget } from '../components/'
import BlogHeader from '../components/BlogHeader'

const posts = [
  {title: 'React Testing', excerpt: 'Learn React Testing'}, 
  {title: 'React with Tailwind', excerpt: 'Learn React with Tailwind'}, 
]


export default function Life() {
  return (
    <div className="container mx-auto px-10 mb-8 bg-gray-100">
      <Head>
        <title>All about you</title>
        <meta name="description" content="Hello you <3" />
        <link rel="icon" href="/NinjaEmoji.jpeg" />
      </Head>
      <BlogHeader />
      <Avatar />
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-12'>
        <div className="lg:col-span-8 col-span-1">
          {posts.map((post) => <PostCard post={post} key={post.title}/>)}
        </div>
        <div className="lg:col-span-4 col-span-1">
            <div classNamme="lg:sticky relative top-8">
              <PostWidget />
              <Categories /> 
            </div>
        </div>
      </div>

    </div>
  )
}
