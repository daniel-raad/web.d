import Link from 'next/link'
import styles from "../styles/Header.module.css"
import Image from 'next/image'
import { useTheme } from '../lib/ThemeContext'

export default function Header({ compact }){
    const { theme, toggleTheme } = useTheme()
    const tooltipText = theme === 'dark' ? 'Day mode' : 'Night mode'

    const handleSpacemanClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        toggleTheme(centerX, centerY)
    }

    if (compact) {
        return (
            <div className={styles.compactHeader}>
                <Link href="/">
                    <a className={styles.compactLink}>
                        <Image src="/astro.png" width="40" height="40" className={styles.compactSpaceman} alt="Home" />
                    </a>
                </Link>
            </div>
        );
    }

    return(
        <section className={styles.hero}>
            <div className={styles.spacePortal} onClick={handleSpacemanClick} role="button" tabIndex={0}>
                <Image src="/astro.png" width="140" height="140" className={styles.spaceman} alt="Toggle theme" />
                <span className={styles.tooltip}>{tooltipText}</span>
            </div>
            <h1 className={styles.name}>Daniel Raad</h1>
            <p className={styles.tagline}>Building things...</p>
        </section>
    );
};
