import Head from 'next/head'
import Header from "../components/Header"
import Description from "../components/Description"

export default function Home() {
  return (
    <div>
      <Head>
        <title>Daniel Raad</title>
        <meta name="description" content="Daniel Raad - Full-Stack Engineer" />
        <link rel="icon" href="/astro.png" />
      </Head>

      <Header/>

      <div className="max-w-2xl mx-auto px-6 pb-10">
        <Description />
      </div>
    </div>
  )
}
