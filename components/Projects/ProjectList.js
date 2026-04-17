import { projects } from "../../constants/constants";
import styles from "../../styles/ProjectList.module.css";
import Image from "next/image";

export default function ProjectList() {
  return (
    <div className={styles.section} id="projects">
      <h2 className={styles.sectionHeader}>Projects</h2>
      <div className={styles.grid}>
        {projects.map((project, i) => (
          <div key={i} className={`${styles.card} ${project.featured ? styles.featured : ''}`}>
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
            {project.badges && project.badges.length > 0 && (
              <div className={styles.badges}>
                {project.badges.map((badge, j) => (
                  <span key={j} className={styles.badge} style={{ backgroundColor: badge.color }}>
                    {badge.label}
                  </span>
                ))}
              </div>
            )}
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
            {project.experiments && project.experiments.length > 0 && (
              <div className={styles.experiments}>
                <h4 className={styles.experimentsHeader}>Experiments</h4>
                {project.experiments.map((exp, j) => (
                  <div key={j} className={styles.experiment}>
                    <div className={styles.expTop}>
                      <span className={styles.expTitle}>{exp.title}</span>
                      <span className={`${styles.expStatus} ${exp.status === 'live' ? styles.expStatusLive : ''}`}>
                        {exp.status}
                      </span>
                    </div>
                    <p className={styles.expDesc}>{exp.description}</p>
                    {exp.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={exp.image} alt={exp.title} className={styles.expImage} />
                    )}
                    <div className={styles.expTags}>
                      {exp.tags.map((tag, k) => (
                        <span key={k} className={styles.tag}>{tag}</span>
                      ))}
                      {exp.link && (
                        <a href={exp.link} target="_blank" rel="noopener noreferrer" className={styles.expLink}>
                          Visit
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
