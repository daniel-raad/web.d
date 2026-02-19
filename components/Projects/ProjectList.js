import { projects } from "../../constants/constants";
import styles from "../../styles/ProjectList.module.css";
import Image from "next/image";
import Link from "next/link";

export default function ProjectList() {
  return (
    <div className={styles.section} id="projects">
      <h2 className={styles.sectionHeader}>Projects</h2>
      <div className={styles.grid}>
        {projects.map((project, i) => (
          <div key={i} className={styles.card}>
            <div className={styles.cardTop}>
              <div className={styles.imageWrap}>
                <Image
                  src={project.featuredImage.url}
                  alt={project.title}
                  width={44}
                  height={44}
                  objectFit="cover"
                  className={styles.image}
                />
              </div>
              <div className={styles.cardInfo}>
                <h3 className={styles.title}>{project.title}</h3>
                <p className={styles.date}>{project.createdAt}</p>
              </div>
            </div>
            <p className={styles.excerpt}>{project.excerpt}</p>
            <div className={styles.tags}>
              {project.tags.map((tag, j) => (
                <span key={j} className={styles.tag}>{tag}</span>
              ))}
            </div>
            {(project.source || project.visit) && (
              <div className={styles.links}>
                {project.source && (
                  <a href={project.source} target="_blank" rel="noopener noreferrer" className={styles.link}>
                    Source
                  </a>
                )}
                {project.visit && (
                  <a href={project.visit} target="_blank" rel="noopener noreferrer" className={styles.link}>
                    Visit
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
