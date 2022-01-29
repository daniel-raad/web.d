import Head from 'next/head'
import Header from "../components/Header"
import Description from "../components/Description"
import { Card } from "react-bootstrap"
import styles from "../styles/About.module.css";
import CV from "../components/CV";


export default function About() {
  return (
    <>
      <Head>
        <title>Read all about it</title>
        <meta name="description" />
        <link rel="icon" href="/NinjaEmoji.jpeg" />
      </Head>
      <Card className={styles.card}>
        <Card.Body>
        
          <Header/>
          <Description />
          <CV/>

        </Card.Body>
      </Card>

    </>
  )
}
