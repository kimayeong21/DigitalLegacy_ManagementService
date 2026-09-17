import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = path.join(projectRoot, 'android-web')
const sourceUrl = process.env.MEMORYLINK_DEV_URL || 'http://127.0.0.1:4174/'

const response = await fetch(sourceUrl)
if (!response.ok) {
  throw new Error(`MemoryLink 화면 생성 실패: ${response.status}`)
}

let html = await response.text()
html = html
  .replace('href="/static/premium.css"', 'href="./static/premium.css"')
  .replace("navigator.serviceWorker.register('/sw.js')", "navigator.serviceWorker.register('./sw.js')")
  .replace('<head>', '<head>\n        <meta name="mobile-web-app-capable" content="yes">')

await rm(outputDir, { recursive: true, force: true })
await mkdir(outputDir, { recursive: true })
await writeFile(path.join(outputDir, 'index.html'), html, 'utf8')
await cp(path.join(projectRoot, 'public', 'static'), path.join(outputDir, 'static'), { recursive: true })

for (const optionalFile of ['sw.js', 'manifest.json']) {
  try {
    const contents = await readFile(path.join(projectRoot, 'public', optionalFile))
    await writeFile(path.join(outputDir, optionalFile), contents)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}

console.log(`Android web assets created in ${outputDir}`)
