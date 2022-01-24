import Head from 'next/head'
import Navbar from '../components/Navbar'
import MyTerminal from '../components/MyTerminal'
 


export default function Home() {
  return (
    <>
      <Head>
        <title>draad is typing...</title>
        <meta name="description" content="Hello, its Daniel" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Navbar/>
      <MyTerminal/>
    </>
  )
}
