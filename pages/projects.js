import Head from 'next/head'
import TypeWriter from '../components/TypeWriter';
import MyProjects from '../components/Projects/MyProjects';
import BackgroundAnimation from '../components/BgAnimation';



export default function Projects() {
  return (
    <div>
      <Head>
        <title>Projects by Daniel</title>
        <meta name="description" />
        <link rel="icon" href="/astro.png" />
      </Head>
      <div className="md:font-serif md:text-white md:text-3xl md:text-left md:pt-10 md:px-10 md:pb-20"> 
        <TypeWriter content={'Checkout my projects...'} speed={100}/> 
      </div>
      <div className="grid grid-cols-2 box-content px-38 py-42 relative auto-cols-auto md:hidden"> 
            <BackgroundAnimation/>
            <BackgroundAnimation/>
      </div>
      <MyProjects/>
    </div>
  )
}
