import styles from "../styles/Header.module.css"
import Image from 'next/image'

export default function Header(){ 
    return(
        <main className={styles.header}>

            <Image src="/NinjaEmoji.jpeg" width="200" height="200" className={styles.dp} />

            
            <h1 className={styles.name}> Daniel Raad</h1>
            <p className={styles.about}> 
                Software Engineer at Lloyds Banking Group 
            </p>

        </main>
    );
};