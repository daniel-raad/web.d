import Head from 'next/head'
import MyTerminal from '../components/MyTerminal'
import styled from 'styled-components';
import Auth from '../components/Auth'
import {auth, app} from "../firebase/clientApp";
import { useAuthState } from "react-firebase-hooks/auth";

const Hero = styled.div`
  height: 15vh;
  display: flex;
  justify-content: center;
  align-item: center; 
  background: #FFEFD5; 
`;

const Heading = styled.h1`
  color: #000;
  font-size: 6rem; 
  font-weight: 600;  
`;



export default function Home() {
  return (    
    <>
      <Auth/> 
      <Head>
        <title>draad is typing...</title>
        <meta name="description" content="Hello, its Daniel" />
        <link rel="icon" href="/NinjaEmoji.jpeg" />
      </Head>
      <Hero>
        <Heading>Hello there!</Heading>
      </Hero>
      <MyTerminal/>
    </>
  )
}
