import { useState } from "react"
import { useRouter } from "next/router"
import Head from "next/head"
import Link from "next/link"
import Header from "../../components/Header"
import HabitsSection from "../../components/Dashboard/HabitsSection"
import styles from "../../styles/Dashboard.module.css"

export default function HabitsPage() {
  const router = useRouter()
  const { view } = router.query
  const [subView, setSubView] = useState(view || "today")

  const handleSubViewChange = (v) => {
    setSubView(v)
    router.replace({ pathname: "/dashboard/habits", query: { view: v } }, undefined, { shallow: true })
  }

  return (
    <div>
      <Head>
        <title>Habits - Daniel Raad</title>
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
        <HabitsSection subView={subView} onSubViewChange={handleSubViewChange} />
      </div>
    </div>
  )
}
