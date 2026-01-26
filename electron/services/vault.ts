import { getDatabase } from './database';
import { randomUUID } from 'crypto';

// ============================================================================
// CHARACTERS
// ============================================================================

export interface Character {
    id: string;
    project_id: string;
    name: string;
    role: string;
    description?: string;
    backstory?: string;
    created_at: string;
    updated_at: string;
}

export function createCharacter(data: {
    project_id: string;
    name: string;
    role?: string;
    description?: string;
    backstory?: string;
}): Character {
    const db = getDatabase();
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
        INSERT INTO characters (id, project_id, name, role, description, backstory, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
        id,
        data.project_id,
        data.name,
        data.role || 'supporting',
        data.description || null,
        data.backstory || null,
        now,
        now
    );

    return getCharacter(id)!;
}

export function getCharacter(id: string): Character | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM characters WHERE id = ?');
    return stmt.get(id) as Character | null;
}

export function getCharactersByProject(projectId: string): Character[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM characters WHERE project_id = ? ORDER BY name ASC');
    return stmt.all(projectId) as Character[];
}

export function updateCharacter(id: string, data: Partial<Character>): Character {
    const db = getDatabase();
    const now = new Date().toISOString();

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
        updates.push('name = ?');
        values.push(data.name);
    }
    if (data.role !== undefined) {
        updates.push('role = ?');
        values.push(data.role);
    }
    if (data.description !== undefined) {
        updates.push('description = ?');
        values.push(data.description);
    }
    if (data.backstory !== undefined) {
        updates.push('backstory = ?');
        values.push(data.backstory);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
        UPDATE characters SET ${updates.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);
    return getCharacter(id)!;
}

export function deleteCharacter(id: string): void {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM characters WHERE id = ?');
    stmt.run(id);
}

// ============================================================================
// WORLD ELEMENTS
// ============================================================================

export interface WorldElement {
    id: string;
    project_id: string;
    category: string;
    name: string;
    description?: string;
    created_at: string;
    updated_at: string;
}

export function createWorldElement(data: {
    project_id: string;
    name: string;
    category: string;
    description?: string;
}): WorldElement {
    const db = getDatabase();
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
        INSERT INTO world_elements (id, project_id, category, name, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
        id,
        data.project_id,
        data.category,
        data.name,
        data.description || null,
        now,
        now
    );

    return getWorldElement(id)!;
}

export function getWorldElement(id: string): WorldElement | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM world_elements WHERE id = ?');
    return stmt.get(id) as WorldElement | null;
}

export function getWorldElementsByProject(projectId: string): WorldElement[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM world_elements WHERE project_id = ? ORDER BY category, name ASC');
    return stmt.all(projectId) as WorldElement[];
}

export function updateWorldElement(id: string, data: Partial<WorldElement>): WorldElement {
    const db = getDatabase();
    const now = new Date().toISOString();

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
        updates.push('name = ?');
        values.push(data.name);
    }
    if (data.category !== undefined) {
        updates.push('category = ?');
        values.push(data.category);
    }
    if (data.description !== undefined) {
        updates.push('description = ?');
        values.push(data.description);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
        UPDATE world_elements SET ${updates.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);
    return getWorldElement(id)!;
}

export function deleteWorldElement(id: string): void {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM world_elements WHERE id = ?');
    stmt.run(id);
}

// ============================================================================
// STYLE GUIDE (Single document per project)
// ============================================================================

export interface StyleGuide {
    id: string;
    project_id: string;
    pov: string;
    tense: string;
    prose_samples?: string;
    vocabulary_preferences?: string;
    things_to_avoid?: string;
    author_influences?: string;
    created_at: string;
    updated_at: string;
}

/**
 * Get or create the style guide for a project.
 * Each project has exactly one style guide.
 */
export function getOrCreateStyleGuide(projectId: string): StyleGuide {
    const db = getDatabase();

    // Try to get existing
    const existing = db.prepare('SELECT * FROM style_guides WHERE project_id = ?').get(projectId) as StyleGuide | undefined;
    if (existing) return existing;

    // Create new
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
        INSERT INTO style_guides (id, project_id, pov, tense, created_at, updated_at)
        VALUES (?, ?, 'third_limited', 'past', ?, ?)
    `);

    stmt.run(id, projectId, now, now);

    return db.prepare('SELECT * FROM style_guides WHERE id = ?').get(id) as StyleGuide;
}

export function updateStyleGuide(projectId: string, data: Partial<StyleGuide>): StyleGuide {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Ensure style guide exists
    getOrCreateStyleGuide(projectId);

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.pov !== undefined) {
        updates.push('pov = ?');
        values.push(data.pov);
    }
    if (data.tense !== undefined) {
        updates.push('tense = ?');
        values.push(data.tense);
    }
    if (data.prose_samples !== undefined) {
        updates.push('prose_samples = ?');
        values.push(data.prose_samples);
    }
    if (data.vocabulary_preferences !== undefined) {
        updates.push('vocabulary_preferences = ?');
        values.push(data.vocabulary_preferences);
    }
    if (data.things_to_avoid !== undefined) {
        updates.push('things_to_avoid = ?');
        values.push(data.things_to_avoid);
    }
    if (data.author_influences !== undefined) {
        updates.push('author_influences = ?');
        values.push(data.author_influences);
    }

    if (updates.length === 0) {
        return getOrCreateStyleGuide(projectId);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(projectId);

    const stmt = db.prepare(`
        UPDATE style_guides SET ${updates.join(', ')} WHERE project_id = ?
    `);

    stmt.run(...values);
    return db.prepare('SELECT * FROM style_guides WHERE project_id = ?').get(projectId) as StyleGuide;
}

/**
 * Prepare a prompt for analyzing the author's writing style based on Chapter 1.
 * Returns an object with both the prompt and the prose sample text.
 */
export function getAuthorStyleAnalysisPrompt(projectId: string): { prompt: string; proseSample: string } {
    const db = getDatabase();

    // 1. Fetch Chapter 1
    const chapter1 = db.prepare('SELECT content FROM chapters WHERE project_id = ? AND chapter_number = 1').get(projectId) as { content: string } | undefined;

    if (!chapter1 || !chapter1.content || chapter1.content.trim().length === 0) {
        throw new Error('Chapter 1 content not found. Please write at least 500 words in Chapter 1 first.');
    }

    // Strip HTML tags to get plain text
    // 1. Replace tags like <p> with a space so words don't stick together
    // 2. Collapse multiple spaces into one
    const plainText = chapter1.content
        .replace(/<[^>]+>/g, ' ') // Remove tags
        .replace(/\s+/g, ' ')     // Normalize whitespace
        .trim();

    // Capture roughly first 2000 words of PLAIN text
    const proseSample = plainText.split(/\s+/).slice(0, 2000).join(' ');

    const prompt = `Analyze this text for authorial voice. Describe the sentence structure (length, complexity), tone, vocabulary level, and Point of View (POV). 
Return a concise, descriptive paragraph (max 150 words) that captures the core essence of this author's voice.

TEXT TO ANALYZE:
"""
${proseSample}
"""`;

    return { prompt, proseSample };
}
