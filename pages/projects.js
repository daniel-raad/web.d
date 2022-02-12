import Head from 'next/head'
import TypeWriter from '../components/TypeWriter';
import MyProjects from '../components/Projects/MyProjects';


export default function Projects() {
  return (
    <>
      <Head>
        <title>Projects by Daniel</title>
        <meta name="description" />
        <link rel="icon" href="/NinjaEmoji.jpeg" />
      </Head>
      <div className="font-serif text-white text-3xl text-left pt-10 px-10"> 
        <TypeWriter content={'Checkout my projects'} speed={100}/> 
      </div>
      <MyProjects/>
    </>
  )
}
