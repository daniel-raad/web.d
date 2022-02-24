import React from 'react';
import Layout from '../components/Layout'
import 'tailwindcss/tailwind.css';
import '../styles/globals.scss'
import '@fortawesome/fontawesome-svg-core/styles.css'



function MyApp({ Component, pageProps }) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}

export default MyApp;
