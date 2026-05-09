import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index === -1) continue
    const key = trimmed.slice(0, index).trim()
    const value = trimmed.slice(index + 1).trim()
    if (!process.env[key]) process.env[key] = value
  }
}

loadDotEnv(path.join(root, '.dev.vars'))
loadDotEnv(path.join(root, '.dev.vars.example'))

const host = process.env.MYSQL_HOST || '127.0.0.1'
const port = Number(process.env.MYSQL_PORT || '3306')
const user = process.env.MYSQL_USER || 'root'
const password = process.env.MYSQL_PASSWORD || ''

const connection = await mysql.createConnection({
  host,
  port,
  user,
  password,
  multipleStatements: true
})

try {
  const schema = fs.readFileSync(path.join(root, 'migrations/mysql_schema.sql'), 'utf8')
  const seed = fs.readFileSync(path.join(root, 'seed.mysql.sql'), 'utf8')
  await connection.query(schema)
  await connection.query(seed)
  await ensureMemoryInsightColumns(connection)
  console.log('MySQL schema, seed data, and AI insight columns are ready.')
} finally {
  await connection.end()
}
