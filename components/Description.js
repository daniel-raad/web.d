import styles from "../styles/Description.module.css";

export default function Description(){ 
    return ( 
        <div className={styles.about}>
            <p> Hello there! My name is Daniel and its lovely to meet you! </p>
            <p> Please feel free to browse this website as I add new elements (chess board incoming!) and try new things!</p>
            <p> I am currently working on a number of different projects, including this website, as I learn react and next, along with GCP and a host of other technologies</p>
            <p> My bread and butter is python, where at the Uni of Southampton I specialised in machine learning - my projects will be posted under projects, or you can find my cv at the bottom of this page :) </p>
        </div>
    )
}