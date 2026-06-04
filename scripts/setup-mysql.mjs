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
const database = process.env.MYSQL_DATABASE || 'memorylink'

const memoryInsightColumns = [
  ['ai_scene_type', 'VARCHAR(120) NULL'],
  ['ai_atmosphere', 'VARCHAR(120) NULL'],
  ['ai_felt_emotion', 'VARCHAR(120) NULL'],
  ['ai_image_observations', 'TEXT NULL'],
  ['ai_event_story', 'TEXT NULL'],
  ['ai_memory_meaning', 'TEXT NULL'],
  ['ai_confidence', 'DECIMAL(4,3) NULL']
]

async function ensureMemoryInsightColumns(connection) {
  for (const [column, definition] of memoryInsightColumns) {
    const [rows] = await connection.query(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'memories' AND COLUMN_NAME = ?`,
      [database, column]
    )

    if (rows.length === 0) {
      await connection.query(`ALTER TABLE \`${database}\`.memories ADD COLUMN ${column} ${definition}`)
    }
  }
}

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
