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
  relationships TEXT, -- JSON string
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
  related_elements TEXT, -- JSON string
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
  variables TEXT, -- JSON string
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

-- Chapter Snapshots (Version Control)
CREATE TABLE IF NOT EXISTS chapter_snapshots (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  word_count INTEGER,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Embeddings for semantic search
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
