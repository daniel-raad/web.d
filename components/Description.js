import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLinkedin, faGithub } from "@fortawesome/free-brands-svg-icons";
import styles from "../styles/Description.module.css";

export default function Description(){
    return (
        <div className={styles.content}>
            <div className={styles.card}>
                <h2 className={styles.sectionHeader}>About</h2>
                <div className={styles.bioText}>
                    <p>Building products end-to-end. Forward Deployed Operations Engineer at <a href="https://www.palantir.com" target="_blank" rel="noopener noreferrer">Palantir</a> and Co-founder of <a href="https://conversify.uk" target="_blank" rel="noopener noreferrer">Conversify</a>, an AI-driven WhatsApp marketing platform. I spend my days deploying AI, and my evenings building a startup from scratch.</p>
                </div>
            </div>

            <div className={styles.navButtons}>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="/api/cv" target="_blank" rel="noopener noreferrer" className={styles.navButton}>
                    CV
                </a>
                <Link href="/writings">
                    <a className={styles.navButton}>Writing</a>
                </Link>
                <Link href="/projects">
                    <a className={styles.navButton}>Projects</a>
                </Link>
                <Link href="/experiments">
                    <a className={styles.navButton}>Experiments</a>
                </Link>
                <Link href="/dashboard">
                    <a className={styles.navButton}>Dashboard</a>
                </Link>
            </div>

            <div className={styles.findMe}>
                <a href="https://www.linkedin.com/in/daniel-raad-784b4b231/" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                    <FontAwesomeIcon icon={faLinkedin} /> LinkedIn
                </a>
                <span className={styles.socialSep}>&middot;</span>
                <a href="https://github.com/daniel-raad" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                    <FontAwesomeIcon icon={faGithub} /> GitHub
                </a>
            </div>
        </div>
    )
}
