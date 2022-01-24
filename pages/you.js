import Head from 'next/head'
import Avatar from '../components/Avatar'
import Navbar from '../components/Navbar'

export default function You() {
  return (
    <>
      <Head>
        <title>All about you</title>
        <meta name="description" content="Hello you <3" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Navbar />
      <Avatar />
    </>
  )
}
