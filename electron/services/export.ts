import { writeFile } from 'fs/promises';
import HTMLtoDOCX from 'html-to-docx';
import epub from 'epub-gen-memory';
import { getDatabase } from './database';
import { getCharactersByProject, getWorldElementsByProject, getOrCreateStyleGuide } from './vault';

interface Chapter {
    id: string;
    project_id: string;
    chapter_number: number;
    title?: string;
    content: string;
    outline?: string;
    summary?: string;
    word_count?: number;
    status?: string;
    chat_history?: string;
    created_at?: string;
    updated_at?: string;
}

interface Project {
    id: string;
    title: string;
    genre?: string;
    author?: string;
    synopsis?: string;
    status?: string;
    target_word_count?: number;
    audience?: string;
    created_at?: string;
    updated_at?: string;
    blurb?: string;
}

/**
 * Clean HTML content for export
 * Removes classes, styles, and extra divs that confuse the converter.
 */
function cleanHtmlForExport(html: string): string {
    if (!html || html.trim() === '') {
        return '<p></p>';
    }

    // 1. Remove attributes that might break parsing
    let cleaned = html.replace(/\s+class="[^"]*"/g, '');
    cleaned = cleaned.replace(/\s+data-[a-z-]+="[^"]*"/g, '');
    cleaned = cleaned.replace(/\s+style="[^"]*"/g, '');

    // 2. Remove <div> tags but keep their content (Flatten the structure)
    // This is often the cause of corruption. We replace divs with simple breaks.
    cleaned = cleaned.replace(/<div[^>]*>/g, '');
    cleaned = cleaned.replace(/<\/div>/g, '<br/>');

    return cleaned;
}

/**
 * Build a Complete HTML Document (Like the working Hello World test)
 */
function buildFullHtmlDoc(project: Project, chapters: Chapter[]): string {
    const sortedChapters = [...chapters].sort((a, b) => a.chapter_number - b.chapter_number);

    let bodyContent = `
        <h1 style="text-align: center; font-size: 36pt;">${project.title}</h1>
        <p style="text-align: center; color: gray;">${project.genre || ''}</p>
        <br style="page-break-after: always;" />
    `;

    for (const chapter of sortedChapters) {
        const chapterTitle = chapter.title || `Chapter ${chapter.chapter_number}`;
        const cleanedContent = cleanHtmlForExport(chapter.content);

        // Simple flat structure. No wrapping divs.
        bodyContent += `
            <h2>${chapterTitle}</h2>
            ${cleanedContent}
            <br style="page-break-after: always;" />
        `;
    }

    // Wrap in the exact structure that worked in the test
    return `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>${project.title}</title>
            </head>
            <body>
                ${bodyContent}
            </body>
        </html>
    `;
}

/**
 * Export selected chapters to a .docx file
 */
export async function exportToDocx(
    projectId: string,
    chapterIds: string[],
    filePath: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getDatabase();

        // 1. Fetch Project
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as Project | undefined;
        if (!project) return { success: false, error: 'Project not found' };

        // 2. Fetch Chapters
        let chapters: Chapter[];
        if (chapterIds.length > 0) {
            const placeholders = chapterIds.map(() => '?').join(',');
            chapters = db.prepare(
                `SELECT * FROM chapters WHERE id IN (${placeholders}) AND project_id = ? ORDER BY chapter_number ASC`
            ).all(...chapterIds, projectId) as Chapter[];
        } else {
            chapters = db.prepare(
                'SELECT * FROM chapters WHERE project_id = ? ORDER BY chapter_number ASC'
            ).all(projectId) as Chapter[];
        }

        if (chapters.length === 0) return { success: false, error: 'No chapters to export' };

        // 3. Build HTML
        const htmlContent = buildFullHtmlDoc(project, chapters);

        // 4. Generate DOCX
        console.log(`[Export] Generating DOCX for ${project.title}...`);

        const docxResult = await HTMLtoDOCX(
            htmlContent,
            null, // Header HTML (Keep null - it worked in test)
            {
                table: { row: { cantSplit: true } },
                footer: true,
                pageNumber: true,
                font: 'Times New Roman',
                fontSize: 24, // 12pt
                title: project.title,
            }
        );

        // 5. Convert Buffer (Using the logic that worked)
        let docxBuffer: Buffer;

        if (Buffer.isBuffer(docxResult)) {
            docxBuffer = docxResult;
        } else {
            // Universal conversion for Electron/Node
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const arrayBuffer = await new Response(docxResult as any).arrayBuffer();
            docxBuffer = Buffer.from(arrayBuffer);
        }

        console.log(`[Export] Final Buffer Size: ${docxBuffer.length} bytes`);

        // 6. Write to Disk
        await writeFile(filePath, docxBuffer);

        console.log(`[Export] Successfully exported ${chapters.length} chapter(s) to ${filePath}`);
        return { success: true };
    } catch (error) {
        console.error('[Export] Failed to export:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error during export'
        };
    }
}

/**
 * Export a single chapter to .docx
 */
export async function exportChapterToDocx(
    chapterId: string,
    filePath: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getDatabase();
        const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(chapterId) as Chapter | undefined;
        if (!chapter) return { success: false, error: 'Chapter not found' };

        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(chapter.project_id) as Project | undefined;
        if (!project) return { success: false, error: 'Project not found' };

        return exportToDocx(chapter.project_id, [chapterId], filePath);
    } catch (error) {
        console.error('[Export] Failed to export chapter:', error);
        return { success: false, error: 'Unknown export error' };
    }
}

/**
 * EXPORT TO EPUB
 */
export async function exportToEpub(projectId: string, chapterIds: string[], filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getDatabase();
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as Project | undefined;
        if (!project) return { success: false, error: 'Project not found' };

        let chapters = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY chapter_number ASC').all(projectId) as Chapter[];
        
        if (chapterIds.length > 0) {
            chapters = chapters.filter(c => chapterIds.includes(c.id));
        }

        const epubContent = chapters.map(ch => ({
            title: ch.title || `Chapter ${ch.chapter_number}`,
            content: `<h2>${ch.title || `Chapter ${ch.chapter_number}`}</h2>${ch.content}`
        }));

        const epubBuffer = await epub({
            title: project.title,
            author: project.author || 'Unknown Author',
            publisher: 'Bouquine',
        }, epubContent);

        await writeFile(filePath, epubBuffer);
        return { success: true };
    } catch (error) {
        console.error('[Export] Failed to export to EPUB:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error during EPUB export'
        };
    }
}

/**
 * Export a complete project to JSON format for backup
 */
export async function exportToProjectJson(
    projectId: string,
    filePath: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getDatabase();

        // 1. Fetch Project Metadata
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as Project | undefined;
        if (!project) return { success: false, error: 'Project not found' };

        // 2. Fetch Chapters
        const chapters = db.prepare(
            'SELECT * FROM chapters WHERE project_id = ? ORDER BY chapter_number ASC'
        ).all(projectId) as Chapter[];

        // 3. Fetch Characters
        const characters = getCharactersByProject(projectId);

        // 4. Fetch World Elements
        const worldElements = getWorldElementsByProject(projectId);

        // 5. Fetch Style Guide
        const styleGuide = getOrCreateStyleGuide(projectId);

        // 6. Structure the JSON data
        const projectData = {
            metadata: {
                exported_at: new Date().toISOString(),
                version: '1.0',
                app: 'Sonic Belt'
            },
            project: {
                id: project.id,
                title: project.title,
                genre: project.genre,
                audience: project.audience,
                author: project.author,
                blurb: project.blurb,
                synopsis: project.synopsis,
                target_word_count: project.target_word_count,
                status: project.status,
                created_at: project.created_at,
                updated_at: project.updated_at
            },
            chapters: chapters.map(chapter => ({
                id: chapter.id,
                chapter_number: chapter.chapter_number,
                title: chapter.title,
                outline: chapter.outline,
                content: chapter.content,
                summary: chapter.summary,
                word_count: chapter.word_count,
                status: chapter.status,
                chat_history: chapter.chat_history,
                created_at: chapter.created_at,
                updated_at: chapter.updated_at
            })),
            characters: characters.map(character => ({
                id: character.id,
                name: character.name,
                role: character.role,
                description: character.description,
                backstory: character.backstory,
                created_at: character.created_at,
                updated_at: character.updated_at
            })),
            worldElements: worldElements.map(element => ({
                id: element.id,
                category: element.category,
                name: element.name,
                description: element.description,
                created_at: element.created_at,
                updated_at: element.updated_at
            })),
            styleGuide: {
                id: styleGuide.id,
                pov: styleGuide.pov,
                tense: styleGuide.tense,
                prose_samples: styleGuide.prose_samples,
                vocabulary_preferences: styleGuide.vocabulary_preferences,
                things_to_avoid: styleGuide.things_to_avoid,
                author_influences: styleGuide.author_influences,
                created_at: styleGuide.created_at,
                updated_at: styleGuide.updated_at
            }
        };

        // 7. Write to file
        const jsonContent = JSON.stringify(projectData, null, 2);
        await writeFile(filePath, jsonContent, 'utf-8');

        console.log(`[Export] Successfully exported project "${project.title}" to ${filePath}`);
        return { success: true };
    } catch (error) {
        console.error('[Export] Failed to export project to JSON:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error during JSON export'
        };
    }
}

/**
 * Build professional manuscript HTML for PDF export
 */
export function buildManuscriptHtml(project: Project, chapters: Chapter[]): string {
    return buildFullHtmlDoc(project, chapters);
}

/**
 * Helper to get project and chapters for PDF export
 */
export async function getProjectExportData(projectId: string, chapterIds?: string[]) {
    const db = getDatabase();
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as Project | undefined;
    if (!project) throw new Error('Project not found');

    let chapters: Chapter[];
    if (chapterIds && chapterIds.length > 0) {
        const placeholders = chapterIds.map(() => '?').join(',');
        chapters = db.prepare(
            `SELECT * FROM chapters WHERE id IN (${placeholders}) AND project_id = ? ORDER BY chapter_number ASC`
        ).all(...chapterIds, projectId) as Chapter[];
    } else {
        chapters = db.prepare(
            'SELECT * FROM chapters WHERE project_id = ? ORDER BY chapter_number ASC'
        ).all(projectId) as Chapter[];
    }

    return { project, chapters };
}