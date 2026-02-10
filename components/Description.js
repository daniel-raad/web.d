import styles from "../styles/Description.module.css";
import CV from "./CV";

export default function Description(){
    return (
        <div className={styles.content}>
            <div className={styles.card}>
                <h2 className={styles.sectionHeader}>About</h2>
                <div className={styles.bioText}>
                    <p>Hello there, my name is Daniel and it&apos;s lovely to meet you.</p>
                    <p>I am a Forward Deployed Operations Engineer at Palantir.</p>
                    <p>I am currently working on a number of different projects, some of which you can find <a href="#projects">below</a>.</p>
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
                </ul>
            </div>

            <div className={styles.card}>
                <div className={styles.cvWrapper}>
                    <CV />
                </div>
            </div>
        </div>
    )
}
