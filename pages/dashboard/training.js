import Head from "next/head"
import Link from "next/link"
import Header from "../../components/Header"
import IronmanView from "../../components/Todos/IronmanView"
import styles from "../../styles/Dashboard.module.css"

export default function TrainingPage() {
  return (
    <div>
      <Head>
        <title>Training Plan - Daniel Raad</title>
        <link rel="icon" href="/astro.png" />
      </Head>

      <Header compact />

      <style jsx global>{`
        .fixed.bottom-0 { display: none; }
      `}</style>

      <div className={`${styles.dashboard} terminal`}>
        <div className={styles.spokeBack}>
          <Link href="/dashboard">
            <a className={styles.spokeBackLink}>&larr; Dashboard</a>
          </Link>
        </div>
        <IronmanView />
      </div>
    </div>
  )
}
