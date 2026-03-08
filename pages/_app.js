import React from 'react';
import Layout from '../components/Layout'
import { AuthProvider } from '../lib/AuthContext'
import ChatWidget from '../components/Chat/ChatWidget'
import 'tailwindcss/tailwind.css';
import '../styles/globals.scss'
import '@fortawesome/fontawesome-svg-core/styles.css'

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
      <ChatWidget />
    </AuthProvider>
  );
}

export default MyApp;
