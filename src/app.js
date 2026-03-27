import anime from 'animejs/lib/anime.es.js'
import { parseRepoUrl, getRepoInfo, getRepoLanguages, getCommitStats, getRepoFilesCount } from './github.js'

function createSearch() {
  return `
  <div class="max-w-3xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-4">Métricas de Repositorio GitHub</h1>
    <div class="flex gap-2">
      <input id="repo-url" class="flex-1 p-3 rounded bg-gray-800 border border-gray-700" placeholder="Pega la URL del repositorio (ej: https://github.com/user/repo)" />
      <button id="analyze" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded">Analizar</button>
    </div>
    <div id="error" class="text-red-400 mt-2"></div>
  </div>
  `
}

function metricCard(title, value, id) {
  return `
  <div class="bg-gray-800 rounded p-4 shadow" id="${id}">
    <div class="text-sm text-gray-400">${title}</div>
    <div class="text-2xl font-mono mt-2">${value}</div>
  </div>
  `
}

function createDashboard() {
  return `
  <div class="max-w-4xl mx-auto p-6 mt-4" id="dashboard">
    <div id="repo-header" class="mb-4"></div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4" id="metrics">
  ${metricCard('Creado', '-', 'm-created')}
  ${metricCard('Última actualización', '-', 'm-updated')}
  ${metricCard('Lenguajes (bytes) — número = bytes de código por lenguaje', '-', 'm-langs')}
  ${metricCard('Commits (últimos 100) — stats sumados: additions/deletions', '-', 'm-commits')}
  ${metricCard('Archivos (blobs en árbol)', '-', 'm-files')}
  ${metricCard('Total añadidos (líneas) — histórico (code_frequency)', '-', 'm-adds')}
    </div>
    <div id="extra" class="mt-6"></div>
  </div>
  `
}

function App() {
  const html = `
    <div class="min-h-screen flex flex-col">
      <div class="bg-gradient-to-r from-gray-900 via-gray-800 to-indigo-900 p-6">
        ${createSearch()}
      </div>
      ${createDashboard()}
    </div>
  `

  setTimeout(setupHandlers, 50)
  return html
}

function showError(msg) {
  document.getElementById('error').textContent = msg
}

function clearError() {
  showError('')
}

async function setupHandlers() {
  const btn = document.getElementById('analyze')
  btn.addEventListener('click', async () => {
    clearError()
    const val = document.getElementById('repo-url').value.trim()
    const parsed = parseRepoUrl(val)
    if (!parsed) {
      showError('URL de repositorio inválida')
      return
    }

    const { owner, repo } = parsed
    try {
      document.getElementById('repo-header').innerHTML = `<div class="text-xl">Analizando <span class="font-semibold">${owner}/${repo}</span>...</div>`

      const [info, langs, commits, filesCount, codeFreq] = await Promise.all([
        getRepoInfo(owner, repo),
        getRepoLanguages(owner, repo),
        getCommitStats(owner, repo),
        getRepoFilesCount(owner, repo),
        // code_frequency may return null with 202 while GitHub builds stats
        // call the helper but it's optional
        (async () => { try { return await (await import('./github.js')).getCodeFrequency(owner, repo) } catch(e) { return null } })()
      ])

      // populate
      document.getElementById('m-created').querySelector('.text-2xl').textContent = new Date(info.created_at).toLocaleString()
      document.getElementById('m-updated').querySelector('.text-2xl').textContent = new Date(info.updated_at).toLocaleString()

  const langLines = Object.entries(langs).map(([k,v])=>`${k}: ${v}`).join(', ')
  document.getElementById('m-langs').querySelector('.text-2xl').textContent = langLines || '-'

      document.getElementById('m-files').querySelector('.text-2xl').textContent = filesCount

      const totalAdds = commits.reduce((s,c)=>s + (c.additions||0), 0)
      // If code frequency is available, compute historical lines added/deleted
      let codeFreqText = '- (no disponible)'
      if (codeFreq && Array.isArray(codeFreq)) {
        const added = codeFreq.reduce((s, row) => s + (row[1] || 0), 0)
        const deleted = codeFreq.reduce((s, row) => s + Math.abs(row[2] || 0), 0)
        codeFreqText = `líneas añadidas: ${added.toLocaleString()} | líneas eliminadas: ${deleted.toLocaleString()}`
      } else if (codeFreq === null) {
        codeFreqText = '(generando estadísticas en GitHub o no disponibles aún)'
      }

      document.getElementById('m-adds').querySelector('.text-2xl').textContent = codeFreqText

      const commitsSummary = `Commits: ${commits.length} | additions: ${totalAdds} | deletions: ${commits.reduce((s,c)=>s+(c.deletions||0),0)}`
      document.getElementById('m-commits').querySelector('.text-2xl').textContent = commitsSummary

      // small animation highlight
      anime({
        targets: '#metrics > div',
        translateY: [-10,0],
        opacity: [0,1],
        delay: anime.stagger(80),
        duration: 600,
        easing: 'easeOutExpo'
      })

      document.getElementById('repo-header').innerHTML = `
        <div class="flex items-center gap-4">
          <img src="${info.owner.avatar_url}" class="w-12 h-12 rounded" />
          <div>
            <div class="text-lg font-bold">${info.full_name}</div>
            <div class="text-sm text-gray-400">${info.description || ''}</div>
          </div>
        </div>
      `

      document.getElementById('extra').innerHTML = `<div class="space-y-2">
        <div class="text-sm text-gray-400">Nota: los números junto a "Lenguajes" representan bytes de código (no líneas). Para líneas históricas se usa el endpoint <code>code_frequency</code> (si está disponible) que devuelve arrays [semana_unix, añadidos, eliminados].</div>
        <pre class="bg-gray-800 p-4 rounded text-sm overflow-auto">${JSON.stringify({info,langs,commitsCount:commits.length}, null, 2)}</pre>
      </div>`

    } catch (err) {
      console.error(err)
      showError('Error al obtener datos. Revisa la consola.')
    }
  })
}

export default App
