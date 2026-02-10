import styles from "../styles/Header.module.css"
import Image from 'next/image'

export default function Header(){
    return(
        <section className={styles.hero}>
            <div className={styles.stars} />
            <Image src="/astro.png" width="140" height="140" className={styles.spaceman} alt="Spaceman" />
            <h1 className={styles.name}>Daniel Raad</h1>
            <p className={styles.tagline}>Forward Deployed Operations Engineer</p>
        </section>
    );
};
