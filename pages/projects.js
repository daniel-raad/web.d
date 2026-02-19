import Head from 'next/head'
import Header from '../components/Header'
import ProjectList from '../components/Projects/ProjectList'

export default function Projects() {
  return (
    <div>
      <Head>
        <title>Projects — Daniel Raad</title>
        <meta name="description" content="Daniel Raad's projects" />
        <link rel="icon" href="/astro.png" />
      </Head>

      <Header compact />

      <div className="max-w-2xl mx-auto px-6 pb-10">
        <ProjectList />
      </div>
    </div>
  )
}
