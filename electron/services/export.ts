import { writeFile } from 'fs/promises';
import HTMLtoDOCX from 'html-to-docx';
import { getDatabase } from './database';

interface Chapter {
    id: string;
    project_id: string;
    chapter_number: number;
    title?: string;
    content: string;
}

interface Project {
    id: string;
    title: string;
    genre?: string;
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
