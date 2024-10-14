import styles from "../styles/Description.module.css";

export default function Description(){ 
    return ( 
        <div className={styles.about}>
            <p> Hello there, my name is Daniel and its lovely to meet you :) </p>
            <p> Feel free to browse this website as I add new elements and mess around with new things.</p>
            <p> I am currently working on a number of different projects, some of which you can find under /projects.</p>
            <p> My bread and butter is python, where at the Uni of Southampton I specialised in machine learning - check out my cv at the bottom of this page :) </p>
        </div>
    )
}