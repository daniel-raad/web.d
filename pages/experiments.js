import Head from 'next/head'
import dynamic from 'next/dynamic'
import Header from '../components/Header'

const WritingsDemo = dynamic(() => import('../components/WritingsDemo'), { ssr: false })

const experiments = [
  {
    title: 'Text Reflow with Pretext',
    description: 'Drag the spaceman around and watch text reflow in real time. Uses chenglou\'s pretext library for DOM-free text measurement — pure arithmetic at 60fps.',
    tags: ['pretext', 'text layout', 'interactive'],
    link: 'https://github.com/chenglou/pretext',
    status: 'live',
    liveDemo: true,
  },
  {
    title: 'Conversational Flow DSL',
    description: 'A graph-based journey DSL for defining WhatsApp conversation flows. Three layers: a fluent TypeScript builder that compiles to nodes + edges, a plugin system (28 plugins covering messages, AI classification, scheduling, and business logic), and a runtime engine that executes the graph — pausing at user input or scheduled delays. Code is the source of truth, synced to Supabase via CLI. Edges carry conditions instead of nodes, so routing is decoupled from logic.',
    tags: ['TypeScript', 'DSL', 'graph engine', 'WhatsApp'],
    image: '/DSL.png',
    status: 'in progress',
  },
]

export default function Experiments() {
  return (
    <div>
      <Head>
        <title>Experiments — Daniel Raad</title>
        <meta name="description" content="Interactive experiments with text layout and AI" />
        <link rel="icon" href="/astro.png" />
      </Head>

      <Header compact />

      <div className="max-w-4xl mx-auto px-6 pb-10" style={{ marginTop: '0.5rem' }}>
        <h2 style={{
          fontSize: '0.7em',
          fontWeight: 700,
          color: 'var(--text-faint)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginBottom: '1rem',
          marginTop: 0,
        }}>
          Experiments
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {experiments.map((exp, i) => (
            <div key={i} style={{
              background: 'var(--bg-elevated)',
              borderRadius: 12,
              padding: '1.25rem 1.5rem',
              boxShadow: 'var(--shadow-sm)',
              transition: 'box-shadow 0.3s ease, transform 0.3s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.4rem' }}>
                <h3 style={{ fontSize: '1em', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                  {exp.title}
                </h3>
                <span style={{
                  fontSize: '0.7em',
                  padding: '0.15rem 0.5rem',
                  borderRadius: 4,
                  background: exp.status === 'live' ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-subtle)',
                  color: exp.status === 'live' ? '#16a34a' : 'var(--text-faint)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  flexShrink: 0,
                }}>
                  {exp.status}
                </span>
              </div>
              <p style={{ fontSize: '0.85em', lineHeight: 1.6, color: 'var(--text-secondary)', margin: '0 0 0.75rem' }}>
                {exp.description}
              </p>
              {exp.liveDemo && <WritingsDemo />}
              {exp.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={exp.image} alt={exp.title} style={{
                  width: '100%',
                  borderRadius: 8,
                  marginBottom: '0.75rem',
                  border: '1px solid var(--border)',
                }} />
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                {exp.tags.map((tag, j) => (
                  <span key={j} style={{
                    fontSize: '0.7em',
                    padding: '0.2rem 0.55rem',
                    borderRadius: 5,
                    background: 'var(--tag-bg)',
                    color: 'var(--tag-color)',
                    fontWeight: 500,
                  }}>
                    {tag}
                  </span>
                ))}
                {(exp.link || exp.source) && (
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                    {exp.link && (
                      <a href={exp.link} target="_blank" rel="noopener noreferrer" style={{
                        fontSize: '0.75em',
                        fontWeight: 500,
                        color: 'var(--accent)',
                        textDecoration: 'none',
                      }}>Visit</a>
                    )}
                    {exp.source && (
                      <a href={exp.source} target="_blank" rel="noopener noreferrer" style={{
                        fontSize: '0.75em',
                        fontWeight: 500,
                        color: 'var(--text-muted)',
                        textDecoration: 'none',
                      }}>Source</a>
                    )}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
