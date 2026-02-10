import styles from "../styles/Description.module.css";

export default function Description(){ 
    return ( 
        <div className={styles.about}>
            <p> Hello there, my name is Daniel and its lovely to meet you :) </p>
            <p> I am a Forward Deployed Operations Engineer at Palantir.</p>
            <p> I am currently working on a number of different projects, some of which you can find under /projects.</p>
        </div>
    )
}