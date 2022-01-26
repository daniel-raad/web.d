import Head from 'next/head'
import MyTerminal from '../components/MyTerminal'
 import styled from 'styled-components';

const Hero = styled.div`
  height: 20vh;
  display: flex;
  justify-content: center;
  align-item: center; 
  background: #fff; 
`;

const Heading = styled.h1`
  color: #000;
  font-size: 6rem; 
  font-weight: 600;  
`;


export default function Home() {
  return (
    <>
      <Head>
        <title>draad is typing...</title>
        <meta name="description" content="Hello, its Daniel" />
        <link rel="icon" href="/NinjaEmoji.jpeg" />
      </Head>
      <Hero>
        <Heading>Welcome</Heading>
      </Hero>
      <MyTerminal/>
    </>
  )
}
