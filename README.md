# GitHub Repo Metrics

Proyecto pequeño que consulta la API pública de GitHub para mostrar métricas básicas de un repositorio.

### Requisitos
- Node.js (>=16)
- npm

### Pasos para ejecutar localmente (compañero)
1. Clonar el repo:

```bash
git clone <tu-repo-git-url>
cd <repo-folder>
```

2. Instalar dependencias:

```bash
npm install
```

3. Ejecutar en modo desarrollo:

```bash
npm run dev
# abrir http://localhost:5173
```

4. Compilar producción (opcional):

```bash
npm run build
npm run preview
```

### Tokens y límites de rate
La app hace peticiones directas a la API pública de GitHub. Si se supera el límite de peticiones, se puede proporcionar un token personal:

- En tiempo de ejecución (en el navegador) pegando en la consola:

```js
window.GH_TOKEN = 'ghp_...'
```

- O como variable de entorno al construir (Vite):

```bash
VITE_GH_TOKEN=ghp_... npm run dev
```

Nunca subas tu token a repositorios públicos.

### Qué representan los números
- "Lenguajes": bytes por lenguaje (valor provisto por `/languages`).
- "Commits": suma de additions/deletions de los últimos 100 commits consultados.
- "Total añadidos (líneas)": intenta mostrar la suma histórica de líneas usando `/stats/code_frequency`. GitHub puede responder 202 si aún está generando las estadísticas; en ese caso espera y vuelve a intentar.

### Mejoras posibles
- Paginación de commits para cubrir toda la historia.
- Backend que clone repos y ejecute análisis más detallados.
- Gráficas por semana usando `code_frequency`.
