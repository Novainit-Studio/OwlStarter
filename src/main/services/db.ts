import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'

export type ServerRecord = {
  id: number
  name: string
  type: string
  variant: string
  version: string
  platform?: string | null
  port: number
  maxPlayers: number
  description?: string | null
  status: string
  jarPath?: string | null
  jarSource?: string | null
  settings?: string | null
  createdAt: string
  updatedAt: string
}

export type CreateServerInput = Omit<ServerRecord, 'id' | 'status' | 'jarPath' | 'jarSource' | 'createdAt' | 'updatedAt'> & {
  status?: string
}

let db: Database.Database | null = null

const toRow = (row: any): ServerRecord => ({
  id: row.id,
  name: row.name,
  type: row.type,
  variant: row.variant,
  version: row.version,
  platform: row.platform,
  port: row.port,
  maxPlayers: row.max_players,
  description: row.description,
  status: row.status,
  jarPath: row.jar_path,
  jarSource: row.jar_source,
  settings: row.settings,
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

export const initDb = (): Database.Database => {
  if (db) {
    return db
  }

  const dataDir = join(app.getPath('userData'), 'data')
  mkdirSync(dataDir, { recursive: true })
  const dbPath = join(dataDir, 'owlstarter.db')
  db = new Database(dbPath)

  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS servers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      variant TEXT NOT NULL,
      version TEXT NOT NULL,
      platform TEXT,
      port INTEGER NOT NULL,
      max_players INTEGER NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      jar_path TEXT,
      jar_source TEXT,
      settings TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)

  return db
}

export const listServers = (): ServerRecord[] => {
  if (!db) {
    initDb()
  }

  const rows = db!.prepare('SELECT * FROM servers ORDER BY created_at DESC').all()
  return rows.map(toRow)
}

export const createServer = (input: CreateServerInput): ServerRecord => {
  if (!db) {
    initDb()
  }

  const now = new Date().toISOString()
  const stmt = db!.prepare(`
    INSERT INTO servers (
      name, type, variant, version, platform, port, max_players,
      description, status, settings, created_at, updated_at
    ) VALUES (
      @name, @type, @variant, @version, @platform, @port, @maxPlayers,
      @description, @status, @settings, @createdAt, @updatedAt
    )
  `)

  const result = stmt.run({
    name: input.name,
    type: input.type,
    variant: input.variant,
    version: input.version,
    platform: input.platform ?? null,
    port: input.port,
    maxPlayers: input.maxPlayers,
    description: input.description ?? null,
    status: input.status ?? 'creating',
    settings: input.settings ?? null,
    createdAt: now,
    updatedAt: now
  })

  const row = db!.prepare('SELECT * FROM servers WHERE id = ?').get(result.lastInsertRowid as number)
  return toRow(row)
}

export const updateServerJar = (id: number, jarPath: string, jarSource: string, status = 'ready'): ServerRecord => {
  if (!db) {
    initDb()
  }

  const now = new Date().toISOString()
  db!.prepare(`
    UPDATE servers
    SET jar_path = ?, jar_source = ?, status = ?, updated_at = ?
    WHERE id = ?
  `).run(jarPath, jarSource, status, now, id)

  const row = db!.prepare('SELECT * FROM servers WHERE id = ?').get(id)
  return toRow(row)
}

export const updateServerStatus = (id: number, status: string): void => {
  if (!db) {
    initDb()
  }

  const now = new Date().toISOString()
  db!.prepare('UPDATE servers SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id)
}

export const deleteServer = (id: number): void => {
  if (!db) {
    initDb()
  }

  db!.prepare('DELETE FROM servers WHERE id = ?').run(id)
}

export const updateServerSettings = (id: number, settings: Record<string, any>): void => {
  if (!db) {
    initDb()
  }

  const now = new Date().toISOString()
  db!.prepare('UPDATE servers SET settings = ?, updated_at = ? WHERE id = ?').run(
    JSON.stringify(settings ?? {}),
    now,
    id
  )
}
