const API = 'https://api.github.com'

export function parseRepoUrl(url) {
  if (!url) return null
  try {
    const u = new URL(url)
    const parts = u.pathname.replace(/^\//, '').split('/')
    if (parts.length >= 2) return { owner: parts[0], repo: parts[1] }
  } catch (e) {
    return null
  }
  return null
}

async function fetchJson(path) {
  const headers = {}
  // Token can come from window (runtime) or Vite env var VITE_GH_TOKEN (build-time)
  const token = (typeof window !== 'undefined' && window.GH_TOKEN) || (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GH_TOKEN)
  if (token) {
    headers['Authorization'] = `token ${token}`
  }
  const res = await fetch(`${API}${path}`, { headers })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`GitHub API error ${res.status}: ${txt}`)
  }
  return res.json()
}

export async function getRepoInfo(owner, repo) {
  return fetchJson(`/repos/${owner}/${repo}`)
}

export async function getRepoLanguages(owner, repo) {
  return fetchJson(`/repos/${owner}/${repo}/languages`)
}

// fetch recent commits (max 100) and extract stats via commit->stats when available
export async function getCommitStats(owner, repo) {
  const commits = await fetchJson(`/repos/${owner}/${repo}/commits?per_page=100`)
  const detailed = []
  for (const c of commits) {
    try {
      const info = await fetchJson(`/repos/${owner}/${repo}/commits/${c.sha}`)
      detailed.push({ additions: info.stats?.additions || 0, deletions: info.stats?.deletions || 0, total: info.stats?.total || 0 })
    } catch (e) {
      // skip
    }
  }
  return detailed
}

// code_frequency returns an array of [week_unix_ts, additions, deletions]
// Note: GitHub may respond 202 if statistics are being generated; return null in that case.
export async function getCodeFrequency(owner, repo) {
  const headers = {}
  if (typeof window !== 'undefined' && window.GH_TOKEN) {
    headers['Authorization'] = `token ${window.GH_TOKEN}`
  }
  const url = `${API}/repos/${owner}/${repo}/stats/code_frequency`
  const res = await fetch(url, { headers })
  if (res.status === 202) {
    // Stats are being generated on GitHub side
    return null
  }
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`GitHub API error ${res.status}: ${txt}`)
  }
  return res.json()
}

// count files by listing tree recursively (uses git/trees with recursive=1)
export async function getRepoFilesCount(owner, repo) {
  // get default branch
  const repoInfo = await getRepoInfo(owner, repo)
  const branch = repoInfo.default_branch
  const tree = await fetchJson(`/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`)
  if (tree && tree.tree) {
    return tree.tree.filter(t => t.type === 'blob').length
  }
  return 0
}
