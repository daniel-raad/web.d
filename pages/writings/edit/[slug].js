import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Header from '../../../components/Header'
import { useAuth, getIdToken } from '../../../lib/AuthContext'
import styles from '../../../styles/BlogEditor.module.css'

export default function EditPost() {
  const router = useRouter()
  const { slug } = router.query
  const { user, loading: authLoading } = useAuth()

  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [type, setType] = useState('daily')
  const [tags, setTags] = useState('')
  const [hidden, setHidden] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/writings')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!slug || !user) return
    fetch(`/api/blog/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
          return
        }
        setTitle(data.title || '')
        setDate(data.date || '')
        setExcerpt(data.excerpt || '')
        setContent(data.content || '')
        setType(data.type || 'daily')
        setTags((data.tags || []).join(', '))
        setHidden(data.hidden || false)
        setLoaded(true)
      })
      .catch(() => setError('Failed to load post'))
  }, [slug, user])

  useEffect(() => {
    if (!showPreview || !content) return
    // Simple markdown to HTML (remark runs server-side, so we do basic conversion here)
    const html = content
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>')
    setPreviewHtml(`<p>${html}</p>`)
  }, [showPreview, content])

  async function handleSave() {
    setSaving(true)
    setError('')
    setStatus('')
    try {
      const token = await getIdToken()
      const res = await fetch(`/api/blog/${slug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          date,
          excerpt,
          content,
          type,
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
          hidden,
        }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setStatus('Saved')
        if (data.slug && data.slug !== slug) {
          router.replace(`/writings/edit/${data.slug}`)
        }
      }
    } catch {
      setError('Save failed')
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('Delete this post?')) return
    try {
      const token = await getIdToken()
      await fetch(`/api/blog/${slug}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      router.replace('/writings')
    } catch {
      setError('Delete failed')
    }
  }

  if (authLoading || !user) return null
  if (!loaded && !error) {
    return (
      <div>
        <Header compact />
        <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.4)' }}>
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div>
      <Head>
        <title>Edit: {title} — Daniel Raad</title>
        <link rel="icon" href="/astro.png" />
      </Head>

      <Header compact />

      <div className={styles.container}>
        <div className={styles.titleRow}>
          <h1 className={styles.pageTitle}>Edit Post</h1>
          {status && <span className={styles.status}>{status}</span>}
          {error && <span className={styles.error}>{error}</span>}
        </div>

        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Title</label>
            <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Date</label>
              <input className={styles.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Type</label>
              <select className={styles.select} value={type} onChange={(e) => setType(e.target.value)}>
                <option value="daily">Daily</option>
                <option value="longform">Longform</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Excerpt</label>
            <input className={styles.input} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Tags (comma-separated)</label>
            <input className={styles.input} value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>

          <div className={styles.checkboxRow}>
            <input type="checkbox" id="hidden" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
            <label htmlFor="hidden" className={styles.checkboxLabel}>Hidden post</label>
          </div>

          <div className={styles.field}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className={styles.label}>Content (Markdown)</label>
              <button className={styles.previewToggle} type="button" onClick={() => setShowPreview(!showPreview)}>
                {showPreview ? 'Edit' : 'Preview'}
              </button>
            </div>
            {showPreview ? (
              <div className={styles.preview} dangerouslySetInnerHTML={{ __html: previewHtml }} />
            ) : (
              <textarea className={styles.textarea} value={content} onChange={(e) => setContent(e.target.value)} />
            )}
          </div>

          <div className={styles.actions}>
            <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button className={styles.deleteBtn} onClick={handleDelete}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  )
}
