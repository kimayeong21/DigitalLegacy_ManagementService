import { mkdir, writeFile } from 'node:fs/promises'
import app from '../dist/_worker.js'

const response = await app.fetch(new Request('https://kimayeong21.github.io/'), {})

if (!response.ok) {
  throw new Error(`Failed to render static page: ${response.status}`)
}

const html = await response.text()

await mkdir('dist', { recursive: true })
await writeFile('dist/index.html', html, 'utf8')
await writeFile('dist/.nojekyll', '', 'utf8')

console.log('Static GitHub Pages entry created at dist/index.html')
