import axios from "axios"

// Obsidian-style vault stored in a private GitHub repo. Daniel opens the same
// repo locally in Obsidian (via the Obsidian Git plugin), so backlinks,
// [[wikilinks]] and graph view all "just work" — we only need to write
// well-formed markdown. We deliberately keep responses small so the agent
// can search/append cheaply.

const TOKEN = process.env.OBSIDIAN_GH_TOKEN
const OWNER = process.env.OBSIDIAN_GH_OWNER
const REPO = process.env.OBSIDIAN_GH_REPO
const BRANCH = process.env.OBSIDIAN_GH_BRANCH || "main"
const COMMITTER = {
  name: process.env.OBSIDIAN_GH_AUTHOR_NAME || "coach-agent",
  email: process.env.OBSIDIAN_GH_AUTHOR_EMAIL || "coach@danielraad.dev",
}

function gh() {
  if (!TOKEN || !OWNER || !REPO) {
    throw new Error(
      "Obsidian vault not configured. Set OBSIDIAN_GH_TOKEN, OBSIDIAN_GH_OWNER, OBSIDIAN_GH_REPO."
    )
  }
  return axios.create({
    baseURL: "https://api.github.com",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    timeout: 20000,
  })
}

export function isConfigured() {
  return Boolean(TOKEN && OWNER && REPO)
}

function normalize(p) {
  return String(p || "")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/")
    .replace(/\.\.+/g, ".")
}

function withMdExt(p) {
  return p.endsWith(".md") ? p : `${p}.md`
}

// Title -> filesystem-safe filename. Preserves spaces + case so Obsidian
// displays the title naturally in its graph.
export function slugifyTitle(title) {
  const safe = String(title || "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 80)
  return `${safe}.md`
}

function parseFrontmatter(text) {
  if (!text.startsWith("---")) return { fm: {}, body: text }
  const end = text.indexOf("\n---", 3)
  if (end < 0) return { fm: {}, body: text }
  const block = text.slice(3, end).trim()
  const body = text.slice(end + 4).replace(/^\n/, "")
  const fm = {}
  for (const line of block.split("\n")) {
    const m = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/)
    if (!m) continue
    let v = m[2].trim()
    if (v.startsWith("[") && v.endsWith("]")) {
      v = v
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean)
    }
    fm[m[1]] = v
  }
  return { fm, body }
}

function buildFrontmatter(fm = {}) {
  const keys = Object.keys(fm).filter(
    (k) => fm[k] !== undefined && fm[k] !== null && fm[k] !== ""
  )
  if (keys.length === 0) return ""
  const lines = ["---"]
  for (const k of keys) {
    const v = fm[k]
    if (Array.isArray(v)) {
      lines.push(`${k}: [${v.map((x) => JSON.stringify(String(x))).join(", ")}]`)
    } else {
      lines.push(`${k}: ${v}`)
    }
  }
  lines.push("---", "")
  return lines.join("\n")
}

async function getContents(path) {
  const api = gh()
  try {
    const res = await api.get(
      `/repos/${OWNER}/${REPO}/contents/${encodeURI(path)}`,
      { params: { ref: BRANCH } }
    )
    const text = Buffer.from(res.data.content, "base64").toString("utf8")
    return { exists: true, sha: res.data.sha, text, path: res.data.path }
  } catch (e) {
    if (e.response?.status === 404) return { exists: false }
    throw e
  }
}

async function putContents(path, text, { sha, message } = {}) {
  const api = gh()
  const body = {
    message: message || (sha ? `coach: update ${path}` : `coach: create ${path}`),
    content: Buffer.from(text, "utf8").toString("base64"),
    branch: BRANCH,
    committer: COMMITTER,
    author: COMMITTER,
  }
  if (sha) body.sha = sha
  const res = await api.put(
    `/repos/${OWNER}/${REPO}/contents/${encodeURI(path)}`,
    body
  )
  return { ok: true, path: res.data.content.path, sha: res.data.content.sha }
}

// Token-frugal search — uses GitHub code search and returns short snippets only.
export async function searchNotes(query, { limit = 8 } = {}) {
  const api = gh()
  const q = `${query} repo:${OWNER}/${REPO} extension:md`
  const res = await api.get("/search/code", {
    params: { q, per_page: Math.min(limit, 20) },
    headers: { Accept: "application/vnd.github.text-match+json" },
  })
  const results = (res.data.items || []).slice(0, limit).map((it) => {
    const frag = it.text_matches?.[0]?.fragment || ""
    const snippet = frag.split("\n").slice(0, 2).join(" ").trim().slice(0, 160)
    return {
      path: it.path,
      title: it.path.replace(/^.*\//, "").replace(/\.md$/, ""),
      snippet,
    }
  })
  return { count: results.length, results }
}

export async function readNote(rawPath) {
  const path = withMdExt(normalize(rawPath))
  const file = await getContents(path)
  if (!file.exists) return { error: `Note not found: ${path}` }
  const { fm, body } = parseFrontmatter(file.text)
  return { path, frontmatter: fm, body }
}

export async function writeNote({ path, title, body, tags, aliases, overwrite = false }) {
  if (!title && !path) return { error: "Either path or title is required" }
  let finalPath = path ? normalize(path) : `notes/${slugifyTitle(title)}`
  finalPath = withMdExt(finalPath)
  const existing = await getContents(finalPath)
  if (existing.exists && !overwrite) {
    return {
      error: `Note already exists: ${finalPath}. Pass overwrite=true to replace, or use vault_append.`,
    }
  }
  const fm = {}
  if (title) fm.title = title
  if (tags && tags.length) fm.tags = tags
  if (aliases && aliases.length) fm.aliases = aliases
  fm.created = new Date().toISOString().slice(0, 10)
  const text = buildFrontmatter(fm) + (body || "")
  return putContents(finalPath, text, { sha: existing.sha })
}

export async function appendNote({ path, section, body }) {
  const finalPath = withMdExt(normalize(path))
  const existing = await getContents(finalPath)
  if (!existing.exists) {
    return { error: `Note not found: ${finalPath}. Use vault_write to create it.` }
  }
  const piece = section
    ? `\n\n## ${section}\n${body || ""}`
    : `\n\n${body || ""}`
  const next = existing.text.replace(/\s+$/, "") + piece + "\n"
  return putContents(finalPath, next, { sha: existing.sha })
}

// Find notes referencing this one via [[wikilink]]. Obsidian shows these as
// backlinks in the side panel; we expose them on-demand so the agent doesn't
// have to scan the whole vault.
export async function findBacklinks(noteTitle, { limit = 8 } = {}) {
  return searchNotes(`"[[${noteTitle}]]"`, { limit })
}
