import Head from "next/head"
import Header from "../../components/Header"
import TodayHub from "../../components/Dashboard/TodayHub"

export default function Dashboard() {
  return (
    <div>
      <Head>
        <title>Dashboard - Daniel Raad</title>
        <meta name="description" content="Personal Dashboard" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" href="/astro.png" />
      </Head>

      <Header compact />

      <style jsx global>{`
        .fixed.bottom-0 { display: none; }
      `}</style>

      <TodayHub />
    </div>
  )
}
