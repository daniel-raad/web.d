import Link from "next/link";
import styles from "../styles/Description.module.css";

export default function Description(){
    return (
        <div className={styles.content}>
            <div className={styles.card}>
                <h2 className={styles.sectionHeader}>About</h2>
                <div className={styles.bioText}>
                    <p>Hey, I'm Daniel. I build things at Palantir and Conversify.</p>
                </div>
            </div>

            <div className={styles.card}>
                <h2 className={styles.sectionHeader}>Find me</h2>
                <ul className={styles.linkList}>
                    <li className={styles.linkItem}>
                        <a href="https://www.linkedin.com/in/daniel-raad-784b4b231/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                    </li>
                    <li className={styles.linkItem}>
                        <a href="https://github.com/daniel-raad" target="_blank" rel="noopener noreferrer">GitHub</a>
                    </li>
                    <li className={styles.linkItem}>
                        <Link href="/habits">Habits</Link>
                    </li>
                    <li className={styles.linkItem}>
                        <Link href="/todos">Todos</Link>
                    </li>
                </ul>
            </div>

            <div className={styles.navButtons}>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="/api/cv" target="_blank" rel="noopener noreferrer" className={styles.navButton}>
                    My CV
                </a>
                <Link href="/projects">
                    <a className={styles.navButton}>My Projects</a>
                </Link>
                <Link href="/writings">
                    <a className={styles.navButton}>My Writings</a>
                </Link>
            </div>
        </div>
    )
}
