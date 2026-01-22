import { create, insert, search, type Orama } from '@orama/orama';
import { getDatabase, type Project, type Chapter } from './database';
import { getCharactersByProject, getWorldElementsByProject, getOrCreateStyleGuide, type Character, type WorldElement, type StyleGuide } from './vault';

export interface ContextPrompt {
    systemPrompt: string;
    userPrompt: string;
}

const MAX_CONTEXT_CHARS = 20000;

// Orama schema for RAG
const oramaSchema = {
    id: 'string',
    projectId: 'string',
    type: 'string', // 'character' | 'world' | 'summary'
    title: 'string',
    content: 'string',
} as const;

// Store the Orama instance per project
let oramaDb: Orama<typeof oramaSchema> | null = null;
let currentIndexedProjectId: string | null = null;

/**
 * Initialize (or re-initialize) the Orama index for a specific project.
 * Loads all Characters, World Elements, and Chapter Summaries.
 */
export async function initializeContextIndex(projectId: string): Promise<void> {
    // Create fresh Orama instance
    oramaDb = await create({
        schema: oramaSchema,
    });

    currentIndexedProjectId = projectId;

    const db = getDatabase();

    // 1. Load Characters
    const characters = getCharactersByProject(projectId);
    for (const char of characters) {
        const content = [
            char.name,
            char.role ? `Role: ${char.role}` : '',
            char.description || '',
            char.backstory || '',
        ].filter(Boolean).join('\n');

        await insert(oramaDb, {
            id: `character-${char.id}`,
            projectId,
            type: 'character',
            title: char.name,
            content,
        });
    }

    // 2. Load World Elements
    const worldElements = getWorldElementsByProject(projectId);
    for (const element of worldElements) {
        const content = [
            element.name,
            element.category ? `Category: ${element.category}` : '',
            element.description || '',
        ].filter(Boolean).join('\n');

        await insert(oramaDb, {
            id: `world-${element.id}`,
            projectId,
            type: 'world',
            title: element.name,
            content,
        });
    }

    // 3. Load Chapter Summaries
    const chapters = db.prepare(
        "SELECT id, title, summary, chapter_number FROM chapters WHERE project_id = ? AND summary IS NOT NULL AND summary != ''"
    ).all(projectId) as Array<{ id: string; title: string; summary: string; chapter_number: number }>;

    for (const ch of chapters) {
        await insert(oramaDb, {
            id: `summary-${ch.id}`,
            projectId,
            type: 'summary',
            title: ch.title || `Chapter ${ch.chapter_number}`,
            content: ch.summary,
        });
    }

    console.log(`[ContextEngine] Indexed ${characters.length} characters, ${worldElements.length} world elements, ${chapters.length} summaries for project ${projectId}`);
}

/**
 * Search the context index for relevant information
 */
export async function searchContext(query: string, projectId: string, limit = 3): Promise<Array<{ type: string; title: string; content: string }>> {
    // Re-initialize if project changed or not initialized
    if (!oramaDb || currentIndexedProjectId !== projectId) {
        await initializeContextIndex(projectId);
    }

    if (!oramaDb) return [];

    try {
        const results = await search(oramaDb, {
            term: query,
            properties: ['title', 'content'],
            limit,
            where: {
                projectId: projectId,
            },
        });

        return results.hits.map((hit) => ({
            type: hit.document.type,
            title: hit.document.title,
            content: hit.document.content,
        }));
    } catch (err) {
        console.error('[ContextEngine] Search error:', err);
        return [];
    }
}

/**
 * Build the prompt with RAG context injection and Style Guide rules
 */
export async function buildPrompt(
    userMessage: string,
    projectId: string,
    chapterId: string,
    selectedText?: string | null
): Promise<ContextPrompt> {
    const db = getDatabase();

    // 1. Fetch Project Info
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as Project;
    if (!project) throw new Error(`Project not found: ${projectId}`);

    // 2. Fetch Current Chapter Content
    const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(chapterId) as Chapter;
    if (!chapter) throw new Error(`Chapter not found: ${chapterId}`);

    // 3. Truncate Content
    let contextContent = chapter.content || '';
    if (contextContent.length > MAX_CONTEXT_CHARS) {
        contextContent = contextContent.slice(-MAX_CONTEXT_CHARS);
    }

    // 4. Search for relevant context from Vault and Summaries
    const relevantContext = await searchContext(userMessage, projectId, 3);

    // 5. Format the relevant context
    let ragSection = '';
    if (relevantContext.length > 0) {
        ragSection = '\n\nRELEVANT CONTEXT (Vault & Summaries):\n';
        for (const item of relevantContext) {
            ragSection += `\n[${item.type.toUpperCase()}] ${item.title}:\n${item.content}\n`;
        }
    }

    // 6. Fetch and format Style Guide rules
    const styleGuide = getOrCreateStyleGuide(projectId);
    let styleSection = '\n\nSTYLE GUIDE RULES (You MUST follow these when writing):\n';

    // POV
    const povLabels: Record<string, string> = {
        'first': 'First Person',
        'second': 'Second Person',
        'third_limited': 'Third Person Limited',
        'third_omniscient': 'Third Person Omniscient',
    };
    styleSection += `- Point of View: ${povLabels[styleGuide.pov] || styleGuide.pov}\n`;

    // Tense
    const tenseLabels: Record<string, string> = {
        'past': 'Past Tense',
        'present': 'Present Tense',
        'future': 'Future Tense',
    };
    styleSection += `- Tense: ${tenseLabels[styleGuide.tense] || styleGuide.tense}\n`;

    // Vocabulary/Voice preferences
    if (styleGuide.vocabulary_preferences && styleGuide.vocabulary_preferences.trim()) {
        styleSection += `- Voice & Vocabulary: ${styleGuide.vocabulary_preferences.trim()}\n`;
    }

    // Things to avoid
    if (styleGuide.things_to_avoid && styleGuide.things_to_avoid.trim()) {
        styleSection += `- AVOID: ${styleGuide.things_to_avoid.trim()}\n`;
    }

    // Author influences
    if (styleGuide.author_influences && styleGuide.author_influences.trim()) {
        styleSection += `- Style Influences: ${styleGuide.author_influences.trim()}\n`;
    }

    // Prose samples (truncated if too long)
    if (styleGuide.prose_samples && styleGuide.prose_samples.trim()) {
        let samples = styleGuide.prose_samples.trim();
        if (samples.length > 1000) {
            samples = samples.slice(0, 1000) + '...';
        }
        styleSection += `- Example Prose Style:\n${samples}\n`;
    }

    // 7. Build selected text section if user highlighted something
    let selectionSection = '';
    if (selectedText && selectedText.trim()) {
        selectionSection = `

USER SELECTED TEXT (The user wants you to focus on this specific passage):
"""
${selectedText}
"""
INSTRUCTIONS: The user has highlighted the text above. Focus your response specifically on the selected text. If they ask for a rewrite, rewrite only that passage.`;
    }

    // 8. Build Book Metadata section
    let metadataSection = `BOOK METADATA:
- Title: ${project.title}
- Author: ${project.author || 'Unknown'}
- Genre: ${project.genre || 'Unspecified'}
- Book Blurb (Premise): ${project.blurb || 'Not specified'}`;

    // 9. Construct System Prompt
    const systemPrompt = `You are an expert fiction editor and writing assistant.

${metadataSection}
${styleSection}
CURRENT CHAPTER TEXT (The user is currently writing this):
${contextContent}${ragSection}${selectionSection}`;

    return {
        systemPrompt,
        userPrompt: userMessage
    };
}

/**
 * Force re-index the current project (call after adding characters/world elements/summaries)
 */
export async function refreshContextIndex(projectId: string): Promise<void> {
    await initializeContextIndex(projectId);
}
