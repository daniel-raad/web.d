import Head from 'next/head'
import Header from "../components/Header"
import Description from "../components/Description"
import ProjectList from "../components/Projects/ProjectList"
import GiscusComments from '../components/GiscusComment';


export default function About() {
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
        <div style={{ marginTop: '2rem' }}>
          <GiscusComments/>
        </div>
      </div>
    </div>
  )
}
