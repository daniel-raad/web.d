import Head from "next/head"
import Header from "../components/Header"
import TodoPage from "../components/Todos/TodoPage"

export default function Todos() {
  return (
    <div>
      <Head>
        <title>Todos — Daniel Raad</title>
        <meta name="description" content="Todo Tracker" />
        <link rel="icon" href="/astro.png" />
      </Head>

      <Header compact />

      <style jsx global>{`
        .fixed.bottom-0 { display: none; }
      `}</style>

      <TodoPage />
    </div>
  )
}
