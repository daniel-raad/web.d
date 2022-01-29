import Layout from '../components/Layout'
import '../styles/globals.css'
import '../styles/navbar.css'
import '@fortawesome/fontawesome-svg-core/styles.css'
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.css";


function MyApp({ Component, pageProps }) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}

export default MyApp;
