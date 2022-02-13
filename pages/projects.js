import Head from 'next/head'
import TypeWriter from '../components/TypeWriter';
import MyProjects from '../components/Projects/MyProjects';
import BackgroundAnimation from '../components/BgAnimation';


export default function Projects() {
  return (
    <>
      <Head>
        <title>Projects by Daniel</title>
        <meta name="description" />
        <link rel="icon" href="/NinjaEmoji.jpeg" />
      </Head>
      <div className="font-serif text-white text-3xl text-left pt-10 px-10 pb-20"> 
        <TypeWriter content={'Scroll down to checkout my projects'} speed={100}/> 
      </div>
      <div className="grid grid-cols-2 box-content px-38 py-42 relative auto-cols-auto"> 
            <BackgroundAnimation/>
            <BackgroundAnimation/>
      </div>
      <MyProjects/>
    </>
  )
}
