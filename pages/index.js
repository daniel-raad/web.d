import React, { useState } from 'react';
import DragMove from "../components/DragMove";
import Head from 'next/head'
import MyTerminal from '../components/MyTerminal'
import styled from 'styled-components';

export default function Home() {

  const [translate, setTranslate] = useState({
    x: 0,
    y: 0
  });

  const handleDragMove = (e) => {
    setTranslate({
      x: translate.x + e.movementX,
      y: translate.y + e.movementY
    });
  };

  return (    
    <div className="container mx-auto px-10 mb-8"> 
      <Head>
        <title>draad is typing...</title>
        <meta name="description" content="Hello, its Daniel" />
        <link rel="icon" href="/NinjaEmoji.jpeg" />
      </Head>
      <DragMove onDragMove={handleDragMove}>
        <div  style={{
            transform: `translateX(${translate.x}px) translateY(${translate.y}px)`
        }}>
          <MyTerminal/>
        </div>
      </DragMove>

    </div>
  )
}
