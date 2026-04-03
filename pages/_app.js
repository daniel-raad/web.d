import React from 'react';
import Layout from '../components/Layout'
import { AuthProvider } from '../lib/AuthContext'
import { ThemeProvider } from '../lib/ThemeContext'
import ChatWidget from '../components/Chat/ChatWidget'
import 'tailwindcss/tailwind.css';
import '../styles/globals.scss'
import '@fortawesome/fontawesome-svg-core/styles.css'

function MyApp({ Component, pageProps }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
        <ChatWidget />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default MyApp;
