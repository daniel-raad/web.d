import Head from 'next/head'
import MyTerminal from '../components/MyTerminal'
import styled from 'styled-components';
import {auth, app} from "../firebase/clientApp";
import { useAuthState } from "react-firebase-hooks/auth";

// const Hero = styled.div`
//   height: 13vh;
//   display: flex;
//   justify-content: center;
//   align-item: center; 
//   background: #FFFF; 
// `;

const Heading = styled.h1`
  text-align: center;
  color: #102F5A;
  font-size: 6rem; 
  font-weight: 600;  
`;



export default function Home() {
  return (    
    <div className="container mx-auto"> 
      <Head>
        <title>draad is typing...</title>
        <meta name="description" content="Hello, its Daniel" />
        <link rel="icon" href="/NinjaEmoji.jpeg" />
      </Head>
      
        <Heading>
          <div className="container mx-auto">
            Hello there!
          </div>
        </Heading>
      
      <MyTerminal/>
    </div>
  )
}
