import { cp, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const output = path.resolve(process.argv[2] || path.join(root, 'dist/demo'))
const worker = path.resolve(process.argv[3] || path.join(root, 'dist/_worker.js'))
const { default: app } = await import(pathToFileURL(worker))
const response = await app.fetch(new Request('https://example.test/'), {})
if (!response.ok) throw new Error(`Render failed: ${response.status}`)
let html = await response.text()
function replaceOnce(before, after) {
  if (!html.includes(before)) throw new Error(`Expected source marker missing: ${before.slice(0, 80)}`)
  html = html.replace(before, after)
}
replaceOnce('href="/static/premium.css"', 'href="./static/premium.css"')
html = html.replace(/\s*<link rel="(?:manifest|icon)"[^>]+>/g, '')
html = html.replaceAll("'memorylink_", "'memorylink_pages_demo_")
replaceOnce('await hydrateLocalMemoriesFromServer();', '// Static demo: records stay in this browser.')
replaceOnce('const response = await axios.get(`${API_BASE}/categories`);', 'const response = { data: LOCAL_CATEGORIES };')
replaceOnce("if ('serviceWorker' in navigator) {", "if (false) {")
replaceOnce('const response = await axios.post(`${API_BASE}/upload`, formData, {', "throw new Error('체험판에서는 이미지 또는 외부 미디어 URL을 사용해 주세요.');\n                    const response = await axios.post(`${API_BASE}/upload`, formData, {")
replaceOnce('showAuthContainer();\n            showRegister();', `
            currentUser = { name: '체험 사용자', email: 'demo@example.test', avatar_url: 'https://ui-avatars.com/api/?name=Demo&background=667eea&color=fff' };
            localMode = true;
            showMainApp();
            document.querySelector('[onclick="logout()"]').textContent = '포트폴리오로';
            logout = function () { location.href = '../'; };
`)
replaceOnce('<body class="bg-gray-50">', `<body class="bg-gray-50">
        <aside style="background:#27251f;color:#fff;padding:12px 20px;font:14px/1.6 sans-serif;text-align:center">
          <a href="../" style="color:#e7d3a0;text-decoration:underline;margin-right:12px">← 포트폴리오</a>
          <strong>MemoryLink 체험판</strong> · 기록은 이 브라우저에 저장됩니다. 계정·서버 저장 및 실제 AI 호출 없이 예시 분석으로 체험합니다.
        </aside>`)
await mkdir(output, { recursive: true })
await writeFile(path.join(output, 'index.html'), html)
await cp(path.join(root, 'public/static'), path.join(output, 'static'), { recursive: true })
console.log(`MemoryLink browser demo exported to ${output}`)
