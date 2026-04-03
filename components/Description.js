import { useState, useEffect } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLinkedin, faGithub } from "@fortawesome/free-brands-svg-icons";
import styles from "../styles/Description.module.css";

const RACE_DATE = "2026-08-23"

function getDaysUntil() {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const target = new Date(RACE_DATE + "T00:00:00")
    const diff = target - now
    return diff > 0 ? Math.floor(diff / (1000 * 60 * 60 * 24)) : 0
}

export default function Description(){
    const [days, setDays] = useState(getDaysUntil)

    useEffect(() => {
        const interval = setInterval(() => setDays(getDaysUntil()), 60000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className={styles.content}>
            <div className={styles.card}>
                <h2 className={styles.sectionHeader}>About</h2>
                <div className={styles.bioText}>
                    <p>Building products end-to-end. Forward Deployed Operations Engineer at <a href="https://www.palantir.com" target="_blank" rel="noopener noreferrer">Palantir</a> and Co-founder of <a href="https://conversify.uk" target="_blank" rel="noopener noreferrer">Conversify</a>, an AI-driven WhatsApp marketing platform. I spend my days deploying AI, and my evenings building a startup from scratch.</p>
                    <p className={styles.ironmanLine}>
                        Training for <span className={styles.ironmanRed}>IRON</span><span className={styles.ironmanWhite}>MAN</span> <span className={styles.ironmanRed}>70.3</span> Estonia — <span className={styles.ironmanDays}>{days}</span> days to go
                    </p>
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
