import Head from "next/head"
import Link from "next/link"
import Header from "../../components/Header"
import TodoPage from "../../components/Todos/TodoPage"
import styles from "../../styles/Dashboard.module.css"

export default function TodosPage() {
  return (
    <div>
      <Head>
        <title>Todos - Daniel Raad</title>
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
        <TodoPage />
      </div>
    </div>
  )
}
