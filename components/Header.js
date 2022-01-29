import styles from "../styles/Header.module.css"


export default function Header(){ 
    return(
        <main className={styles.header}>
            <img src="/NinjaEmoji.jpeg" className={styles.dp} />
            <h1 className={styles.name}> Daniel Raad</h1>
            <p className={styles.about}> 
                Software Engineer at Lloyds Banking Group 
            </p>

        </main>
    );
};