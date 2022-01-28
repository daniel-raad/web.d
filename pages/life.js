import Head from 'next/head'
import Avatar from '../components/Avatar'


export default function Life() {
  return (
    <>
      <Head>
        <title>All about you</title>
        <meta name="description" content="Hello you <3" />
        <link rel="icon" href="/NinjaEmoji.jpeg" />
      </Head>
      <Avatar />
    </>
  )
}
