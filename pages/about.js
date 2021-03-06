import Head from 'next/head'
import Header from "../components/Header"
import Description from "../components/Description"
import { Card } from "react-bootstrap"
import CV from "../components/CV";
import GiscusComments from '../components/GiscusComment';


export default function About() {
  return (
    <div className="container mx-auto px-10 mb-8"> 
      <Head>
        <title>Read all about it</title>
        <meta name="description" />
        <link rel="icon" href="/astro.png" />
      </Head>
      
      <Card className="relative bg-slate-300 text-black mt-10 mb-5 ml-15 text-center p-8 shadow rounded-lg shadow-black">
        <Card.Body>
        
          <Header/>
          <Description />
          <CV/>

        </Card.Body>
      </Card>
      <GiscusComments/> 
    </div>

  )
}
