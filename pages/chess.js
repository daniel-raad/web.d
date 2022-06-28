import React from 'react'
import Chessboard from '../components/Chess/Chessboard'
import Head from 'next/head'
const chess = () => {
  return (
    <div className="grid place-content-center w-screen pb-40 pt-5">
      <Head>
        <title>Quick game?</title>
        <meta name="description" />
        <link rel="icon" href="/astro.png" />
        
      </Head>
      <Chessboard/> 
    </div>
    
  )
}

export default chess