import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { randomUUID } from 'crypto';
import fs from 'fs';

const SCHEMA = `
-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  genre TEXT,
  audience TEXT,
  target_word_count INTEGER DEFAULT 80000,
  status TEXT DEFAULT 'draft',
  author TEXT,
  blurb TEXT,
  synopsis TEXT,
  last_visited_chapter_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Chapters
CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  title TEXT,
  outline TEXT,
  content TEXT DEFAULT '',
  summary TEXT,
  word_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'outline',
  chat_history TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Characters
CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'supporting',
  description TEXT,
  backstory TEXT,
  arc TEXT,
  relationships TEXT,
  voice_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- World Elements
CREATE TABLE IF NOT EXISTS world_elements (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  related_elements TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Style Guides
CREATE TABLE IF NOT EXISTS style_guides (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pov TEXT DEFAULT 'third_limited',
  tense TEXT DEFAULT 'past',
  prose_samples TEXT,
  vocabulary_preferences TEXT,
  things_to_avoid TEXT,
  author_influences TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Prompt Templates
CREATE TABLE IF NOT EXISTS prompt_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  template TEXT NOT NULL,
  variables TEXT,
  is_system_default BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Generation History
CREATE TABLE IF NOT EXISTS generation_history (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL,
  prompt_template_id TEXT,
  input_context TEXT,
  output TEXT,
  provider TEXT,
  tokens_used INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Chapter Snapshots
CREATE TABLE IF NOT EXISTS chapter_snapshots (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  word_count INTEGER,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Project References (renamed from 'references' to avoid keyword conflict)
CREATE TABLE IF NOT EXISTS project_references (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  type TEXT DEFAULT 'link',
  url TEXT,
  related_elements TEXT, -- JSON array of {id, type}
  tag TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Embeddings
CREATE TABLE IF NOT EXISTS embeddings (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding BLOB,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chapters_project ON chapters(project_id);
CREATE INDEX IF NOT EXISTS idx_characters_project ON characters(project_id);
CREATE INDEX IF NOT EXISTS idx_world_elements_project ON world_elements(project_id);
CREATE INDEX IF NOT EXISTS idx_style_guides_project ON style_guides(project_id);
CREATE INDEX IF NOT EXISTS idx_generation_history_project ON generation_history(project_id);
CREATE INDEX IF NOT EXISTS idx_chapter_snapshots_chapter ON chapter_snapshots(chapter_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_source ON embeddings(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_project_references_project ON project_references(project_id);
`;

let db: Database.Database;

function migrateLegacyDatabase(): void {
  const userDataPath = app.getPath('userData');
  const newDbPath = path.join(userDataPath, 'novelforge.db');

  // Get the parent directory (should be ~/Library/Application Support/bouquine)
  const parentDir = path.dirname(userDataPath);

  // Check for legacy sonic-belt database
  const legacyDbPath = path.join(parentDir, 'sonic-belt', 'novelforge.db');

  // Check if legacy database exists
  const legacyExists = fs.existsSync(legacyDbPath);

  if (!legacyExists) {
    console.log('[DB] No legacy database found, starting fresh');
    return;
  }

  // Check if new database already has data
  const newDbExists = fs.existsSync(newDbPath);
  let newDbHasData = false;

  if (newDbExists) {
    try {
      const testDb = new Database(newDbPath);
      const result = testDb.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };
      newDbHasData = result.count > 0;
      testDb.close();
    } catch (e) {
      console.log('[DB] New database appears corrupted, will migrate from legacy');
      newDbHasData = false;
    }
  }

  // Only migrate if new database has no data
  if (newDbHasData) {
    console.log('[DB] New database already has data, keeping current database');
    return;
  }

  // Perform migration: copy legacy database to new location
  console.log('[DB] Migrating data from legacy sonic-belt database...');
  try {
    fs.copyFileSync(legacyDbPath, newDbPath);
    console.log('[DB] Legacy database migrated successfully');
  } catch (error) {
    console.error('[DB] Failed to migrate legacy database:', error);
  }
}

export function getDatabase() {
  if (db) return db;

  // Check for legacy database migration
  migrateLegacyDatabase();

  const dbPath = path.join(app.getPath('userData'), 'novelforge.db');
  console.log('[DB] Opening database at:', dbPath);
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run schema
  db.exec(SCHEMA);

  // Run migrations for new columns
  runMigrations();

  return db;
}

function runMigrations() {
  // Check if author column exists in projects table
  const columns = db.prepare("PRAGMA table_info(projects)").all() as Array<{ name: string }>;
  const columnNames = columns.map(c => c.name);

  if (!columnNames.includes('author')) {
    console.log('[DB] Adding author column to projects table');
    db.exec('ALTER TABLE projects ADD COLUMN author TEXT');
  }

  if (!columnNames.includes('blurb')) {
    console.log('[DB] Adding blurb column to projects table');
    db.exec('ALTER TABLE projects ADD COLUMN blurb TEXT');
  }

  if (!columnNames.includes('synopsis')) {
    console.log('[DB] Adding synopsis column to projects table');
    db.exec('ALTER TABLE projects ADD COLUMN synopsis TEXT');
  }

  if (!columnNames.includes('last_visited_chapter_id')) {
    console.log('[DB] Adding last_visited_chapter_id column to projects table');
    db.exec('ALTER TABLE projects ADD COLUMN last_visited_chapter_id TEXT');
  }

  // Check if chat_history column exists in chapters table
  const chapterColumns = db.prepare("PRAGMA table_info(chapters)").all() as Array<{ name: string }>;
  const chapterColumnNames = chapterColumns.map(c => c.name);

  if (!chapterColumnNames.includes('chat_history')) {
    console.log('[DB] Adding chat_history column to chapters table');
    db.exec('ALTER TABLE chapters ADD COLUMN chat_history TEXT');
  }

  // Check project_references
  const refColumns = db.prepare("PRAGMA table_info(project_references)").all() as Array<{ name: string }>;
  const refColumnNames = refColumns.map(c => c.name);

  if (!refColumnNames.includes('related_elements')) {
    console.log('[DB] Adding related_elements column to project_references table');
    db.exec('ALTER TABLE project_references ADD COLUMN related_elements TEXT');
  }

  if (!refColumnNames.includes('tag')) {
    console.log('[DB] Adding tag column to project_references table');
    db.exec('ALTER TABLE project_references ADD COLUMN tag TEXT');
  }
}


export function closeDatabase() {
  if (db) {
    db.close();
  }
}

// ============================================================================
// PROJECTS
// ============================================================================

export interface Project {
  id: string;
  title: string;
  genre?: string;
  audience?: string;
  author?: string;
  blurb?: string;
  synopsis?: string;
  last_visited_chapter_id?: string;
  target_word_count: number;
  status: 'draft' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

export function createProject(data: {
  title: string;
  genre?: string;
  audience?: string;
  target_word_count?: number;
}): Project {
  const db = getDatabase();
  const id = randomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO projects (id, title, genre, audience, target_word_count, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'draft', ?, ?)
  `);

  stmt.run(
    id,
    data.title,
    data.genre || null,
    data.audience || null,
    data.target_word_count || 80000,
    now,
    now
  );

  return getProject(id)!;
}

export function getProject(id: string): Project | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM projects WHERE id = ?');
  return stmt.get(id) as Project | null;
}

export function getAllProjects(): Project[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM projects ORDER BY updated_at DESC');
  return stmt.all() as Project[];
}

export function updateProject(id: string, data: Partial<Project>): Project {
  const db = getDatabase();
  const now = new Date().toISOString();

  const updates: string[] = [];
  const values: any[] = [];

  if (data.title !== undefined) {
    updates.push('title = ?');
    values.push(data.title);
  }
  if (data.genre !== undefined) {
    updates.push('genre = ?');
    values.push(data.genre);
  }
  if (data.audience !== undefined) {
    updates.push('audience = ?');
    values.push(data.audience);
  }
  if (data.author !== undefined) {
    updates.push('author = ?');
    values.push(data.author);
  }
  if (data.blurb !== undefined) {
    updates.push('blurb = ?');
    values.push(data.blurb);
  }
  if (data.synopsis !== undefined) {
    updates.push('synopsis = ?');
    values.push(data.synopsis);
  }
  if (data.target_word_count !== undefined) {
    updates.push('target_word_count = ?');
    values.push(data.target_word_count);
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    values.push(data.status);
  }
  if (data.last_visited_chapter_id !== undefined) {
    updates.push('last_visited_chapter_id = ?');
    values.push(data.last_visited_chapter_id);
  }

  updates.push('updated_at = ?');
  values.push(now);
  values.push(id);

  const stmt = db.prepare(`
    UPDATE projects SET ${updates.join(', ')} WHERE id = ?
  `);

  stmt.run(...values);
  return getProject(id)!;
}

export function deleteProject(id: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
  stmt.run(id);
}

// ============================================================================
// CHAPTERS
// ============================================================================

export interface Chapter {
  id: string;
  project_id: string;
  chapter_number: number;
  title?: string;
  outline?: string;
  content: string;
  summary?: string;
  word_count: number;
  status: 'outline' | 'draft' | 'revision' | 'polished';
  chat_history?: string;
  created_at: string;
  updated_at: string;
}

export function createChapter(data: {
  project_id: string;
  chapter_number: number;
  title?: string;
  outline?: string;
}): Chapter {
  const db = getDatabase();
  const id = randomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO chapters (id, project_id, chapter_number, title, outline, content, word_count, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, '', 0, 'outline', ?, ?)
  `);

  stmt.run(
    id,
    data.project_id,
    data.chapter_number,
    data.title || null,
    data.outline || null,
    now,
    now
  );

  return getChapter(id)!;
}

export function getChapter(id: string): Chapter | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM chapters WHERE id = ?');
  return stmt.get(id) as Chapter | null;
}

export function getChaptersByProject(projectId: string): Chapter[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY chapter_number ASC');
  return stmt.all(projectId) as Chapter[];
}

export function saveChapterContent(id: string, content: string): Chapter {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Calculate word count
  const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;

  const stmt = db.prepare(`
    UPDATE chapters 
    SET content = ?, word_count = ?, updated_at = ?
    WHERE id = ?
  `);

  stmt.run(content, wordCount, now, id);
  return getChapter(id)!;
}

export function updateChapter(id: string, data: Partial<Chapter>): Chapter {
  const db = getDatabase();
  const now = new Date().toISOString();

  const updates: string[] = [];
  const values: any[] = [];

  if (data.title !== undefined) {
    updates.push('title = ?');
    values.push(data.title);
  }
  if (data.outline !== undefined) {
    updates.push('outline = ?');
    values.push(data.outline);
  }
  if (data.summary !== undefined) {
    updates.push('summary = ?');
    values.push(data.summary);
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    values.push(data.status);
  }
  if (data.chat_history !== undefined) {
    updates.push('chat_history = ?');
    values.push(data.chat_history);
  }

  updates.push('updated_at = ?');
  values.push(now);
  values.push(id);

  const stmt = db.prepare(`
    UPDATE chapters SET ${updates.join(', ')} WHERE id = ?
  `);

  stmt.run(...values);
  return getChapter(id)!;
}

export function deleteChapter(id: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM chapters WHERE id = ?');
  stmt.run(id);
}

// ============================================================================
// CHAPTER SNAPSHOTS (Version Control)
// ============================================================================

export function createChapterSnapshot(chapterId: string, note?: string): void {
  const db = getDatabase();
  const chapter = getChapter(chapterId);
  if (!chapter) return;

  const id = randomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO chapter_snapshots (id, chapter_id, content, word_count, note, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, chapterId, chapter.content, chapter.word_count, note || '', now);
}

// ============================================================================
// REFERENCES (Research)
// ============================================================================

export interface Reference {
  id: string;
  project_id: string;
  title: string;
  content?: string;
  type: 'link' | 'note';
  url?: string;
  related_elements?: string;
  tag?: string;
  created_at: string;
  updated_at: string;
}

export function getReferences(projectId: string): Reference[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM project_references WHERE project_id = ? ORDER BY updated_at DESC');
  return stmt.all(projectId) as Reference[];
}

export function getReference(id: string): Reference | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM project_references WHERE id = ?');
  return stmt.get(id) as Reference | null;
}

export function createReference(data: {
  project_id: string;
  title: string;
  content?: string;
  type: 'link' | 'note';
  url?: string;
  related_elements?: string;
  tag?: string;
}): Reference {
  const db = getDatabase();
  const id = randomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
        INSERT INTO project_references (id, project_id, title, content, type, url, related_elements, tag, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

  stmt.run(
    id,
    data.project_id,
    data.title,
    data.content || '',
    data.type,
    data.url || '',
    data.related_elements || null,
    data.tag || null,
    now,
    now
  );
  return getReference(id)!;
}

export function updateReference(id: string, data: Partial<Reference>): Reference {
  const db = getDatabase();
  const now = new Date().toISOString();

  const updates: string[] = [];
  const values: any[] = [];

  const allowedFields = ['title', 'content', 'type', 'url', 'related_elements', 'tag'];
  for (const field of allowedFields) {
    if ((data as any)[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push((data as any)[field]);
    }
  }

  updates.push('updated_at = ?');
  values.push(now);
  values.push(id);

  const stmt = db.prepare(`
    UPDATE project_references SET ${updates.join(', ')} WHERE id = ?
  `);

  stmt.run(...values);
  return getReference(id)!;
}

export function deleteReference(id: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM project_references WHERE id = ?');
  stmt.run(id);
}

export function getReferencesByChapter(chapterId: string): Reference[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM project_references 
    WHERE related_elements LIKE ?
  `);
  return stmt.all('%' + chapterId + '%') as Reference[];
}
