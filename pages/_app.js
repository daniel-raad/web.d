import Layout from '../components/Layout'
import '../styles/globals.css'
import '@fortawesome/fontawesome-svg-core/styles.css'

function MyApp({ Component, pageProps }) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}

export default MyApp;
