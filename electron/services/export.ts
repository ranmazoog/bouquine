import { writeFile } from 'fs/promises';
import { Document, Packer, Paragraph, TextRun, PageBreak, AlignmentType } from 'docx';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { getDatabase } from './database';
import { logger } from './logger';

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

interface Project {
    id: string;
    title?: string;
    author?: string;
    genre?: string;
    blurb?: string;
    synopsis?: string;
    created_at?: string;
    updated_at?: string;
}

interface Chapter {
    id: string;
    project_id: string;
    chapter_number: number;
    title?: string;
    content?: string;
}

interface Character {
    id: string;
    project_id: string;
    name: string;
    role: string;
    description?: string;
    backstory?: string;
    created_at: string;
    updated_at: string;
}

interface WorldElement {
    id: string;
    project_id: string;
    category: string;
    name: string;
    description?: string;
    created_at: string;
    updated_at: string;
}

interface StyleGuide {
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

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function escapeHtml(text: string | null | undefined): string {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function stripHtml(html: string): string {
    if (!html) return '';
    return html
        .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .trim();
}

function formatDate(dateString?: string): string {
    if (!dateString) return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    try {
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    } catch {
        return dateString;
    }
}

// ═══════════════════════════════════════════════════════════════
// DOCX EXPORT
// ═══════════════════════════════════════════════════════════════

export async function exportToDocx(
    projectId: string,
    chapterIds: string[],
    filePath: string
): Promise<{ success: boolean; error?: string }> {
    try {
        logger.logInfo(`[Export DOCX] Starting for project ${projectId}`);
        const db = getDatabase();

        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as Project | undefined;
        if (!project) return { success: false, error: 'Project not found' };

        let chapters = db.prepare(
            'SELECT * FROM chapters WHERE project_id = ? ORDER BY chapter_number ASC'
        ).all(projectId) as Chapter[];

        if (chapterIds?.length > 0) {
            chapters = chapters.filter(c => chapterIds.includes(c.id));
        }

        if (chapters.length === 0) return { success: false, error: 'No chapters to export' };

        const children: Paragraph[] = [];

        // Title Page logic
        for (let i = 0; i < 8; i++) children.push(new Paragraph({ text: '' }));

        children.push(
            new Paragraph({
                children: [new TextRun({ text: (project.title || 'Untitled').toUpperCase(), bold: true, size: 56, font: 'Times New Roman' })],
                alignment: AlignmentType.CENTER
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
                children: [new TextRun({ text: 'by', size: 28, font: 'Times New Roman' })],
                alignment: AlignmentType.CENTER
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
                children: [new TextRun({ text: project.author || 'Anonymous', bold: true, size: 32, font: 'Times New Roman' })],
                alignment: AlignmentType.CENTER
            })
        );

        // ... rest of docx logic is stable ...
        if (project.genre) {
            children.push(new Paragraph({ text: '' }), new Paragraph({
                children: [new TextRun({ text: project.genre, size: 24, font: 'Times New Roman', color: '666666' })],
                alignment: AlignmentType.CENTER
            }));
        }

        const blurbText = project.blurb || project.synopsis;
        if (blurbText) {
            children.push(new Paragraph({ text: '' }), new Paragraph({ text: '' }), new Paragraph({
                children: [new TextRun({ text: blurbText, italics: true, size: 22, font: 'Times New Roman' })],
                alignment: AlignmentType.CENTER
            }));
        }

        children.push(new Paragraph({ text: '' }), new Paragraph({ text: '' }), new Paragraph({ text: '' }),
            new Paragraph({ children: [new TextRun({ text: `Created: ${formatDate(project.created_at)}`, size: 20, color: '888888', font: 'Times New Roman' })], alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [new TextRun({ text: `Last Updated: ${formatDate(project.updated_at)}`, size: 20, color: '888888', font: 'Times New Roman' })], alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [new TextRun({ text: `Exported: ${formatDate()}`, size: 20, color: '888888', font: 'Times New Roman' })], alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [new PageBreak()] })
        );

        for (const chapter of chapters) {
            const chapterTitle = chapter.title || `Chapter ${chapter.chapter_number}`;
            children.push(new Paragraph({ text: '' }), new Paragraph({ text: '' }), new Paragraph({
                children: [new TextRun({ text: chapterTitle.toUpperCase(), bold: true, size: 28, font: 'Times New Roman' })],
                alignment: AlignmentType.CENTER
            }), new Paragraph({ text: '' }));

            const paragraphs = stripHtml(chapter.content || '').split(/\n\n+/).filter(p => p.trim());
            for (const para of paragraphs) {
                children.push(new Paragraph({
                    children: [new TextRun({ text: para.trim(), size: 24, font: 'Times New Roman' })],
                    alignment: AlignmentType.LEFT,
                    spacing: { before: 0, after: 240 }
                }));
            }
            if (chapter !== chapters[chapters.length - 1]) {
                children.push(new Paragraph({ children: [new PageBreak()] }));
            }
        }

        const doc = new Document({ sections: [{ properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children }] });
        const buffer = await Packer.toBuffer(doc);
        await writeFile(filePath, buffer);
        logger.logInfo(`[Export DOCX] Success: ${filePath}`);
        return { success: true };
    } catch (error) {
        logger.logError('[Export DOCX] Failed', error);
        return { success: false, error: error instanceof Error ? error.message : 'DOCX export failed' };
    }
}

export async function exportChapterToDocx(chapterId: string, filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getDatabase();
        const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(chapterId) as Chapter | undefined;
        if (!chapter) return { success: false, error: 'Chapter not found' };
        return exportToDocx(chapter.project_id, [chapterId], filePath);
    } catch (error) {
        logger.logError('[Export Chapter] Failed', error);
        return { success: false, error: 'Failed to export chapter' };
    }
}

// ═══════════════════════════════════════════════════════════════
// PDF EXPORT
// ═══════════════════════════════════════════════════════════════

export async function exportToPdf(
    projectId: string,
    chapterIds: string[],
    filePath: string
): Promise<{ success: boolean; error?: string }> {
    try {
        logger.logInfo(`[Export PDF] Starting export to ${filePath}`);

        const db = getDatabase();
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as Project | undefined;
        if (!project) return { success: false, error: 'Project not found' };

        let chapters = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY chapter_number ASC').all(projectId) as Chapter[];
        if (chapterIds?.length > 0) chapters = chapters.filter(c => chapterIds.includes(c.id));
        if (chapters.length === 0) return { success: false, error: 'No chapters to export' };

        logger.logInfo(`[Export PDF] Project "${project.title}" found, ${chapters.length} chapters.`);

        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
        const fontItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

        const pageWidth = 612;
        const pageHeight = 792;
        const margin = 72;
        const fontSize = 12;
        const lineHeight = fontSize * 1.5;

        // Title Page
        let page = pdfDoc.addPage([pageWidth, pageHeight]);
        let y = pageHeight - 200;

        const drawCentered = (text: string, size: number, pdfFont: any, color = rgb(0, 0, 0)) => {
            const width = pdfFont.widthOfTextAtSize(text, size);
            page.drawText(text, { x: (pageWidth - width) / 2, y, size, font: pdfFont, color });
        };

        drawCentered((project.title || 'Untitled').toUpperCase(), 28, fontBold);
        y -= 50;
        drawCentered('by', 14, font);
        y -= 30;
        drawCentered(project.author || 'Anonymous', 18, fontBold);

        if (project.blurb || project.synopsis) {
            y -= 60;
            const words = (project.blurb || project.synopsis || '').split(/\s+/);
            let line = '';
            for (const word of words) {
                const test = line + (line ? ' ' : '') + word;
                if (fontItalic.widthOfTextAtSize(test, 11) > (pageWidth - margin * 2 - 100)) {
                    drawCentered(line, 11, fontItalic);
                    line = word;
                    y -= 15;
                    if (y < margin) { page = pdfDoc.addPage([pageWidth, pageHeight]); y = pageHeight - margin; }
                } else { line = test; }
            }
            if (line) drawCentered(line, 11, fontItalic);
        }

        // Chapters
        for (const chapter of chapters) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin - 50;
            const title = (chapter.title || `Chapter ${chapter.chapter_number}`).toUpperCase();
            drawCentered(title, 14, fontBold);
            y -= 40;

            const paragraphs = stripHtml(chapter.content || '').split(/\n\n+/).filter(p => p.trim());
            for (const para of paragraphs) {
                const words = para.split(/\s+/);
                let line = '';
                let isFirstLine = true;

                for (const word of words) {
                    const test = line + (line ? ' ' : '') + word;
                    const limit = pageWidth - margin * 2 - (isFirstLine ? 36 : 0);
                    if (font.widthOfTextAtSize(test, fontSize) > limit) {
                        page.drawText(line, { x: margin + (isFirstLine ? 36 : 0), y, size: fontSize, font });
                        line = word;
                        y -= lineHeight;
                        isFirstLine = false;
                        if (y < margin) { page = pdfDoc.addPage([pageWidth, pageHeight]); y = pageHeight - margin; }
                    } else { line = test; }
                }
                if (line) {
                    page.drawText(line, { x: margin + (isFirstLine ? 36 : 0), y, size: fontSize, font });
                    y -= lineHeight;
                }
                y -= 10; // Paragraph gap
                if (y < margin + lineHeight) { page = pdfDoc.addPage([pageWidth, pageHeight]); y = pageHeight - margin; }
            }
        }

        const pdfBytes = await pdfDoc.save();
        await writeFile(filePath, pdfBytes);
        logger.logInfo(`[Export PDF] Success: ${filePath} (${pdfBytes.length} bytes)`);
        return { success: true };
    } catch (error) {
        logger.logError('[Export PDF] Fatal Error', error);
        return { success: false, error: error instanceof Error ? error.message : 'PDF export failed' };
    }
}

// ═══════════════════════════════════════════════════════════════
// EPUB EXPORT
// ═══════════════════════════════════════════════════════════════

export async function exportToEpub(
    projectId: string,
    chapterIds: string[],
    filePath: string
): Promise<{ success: boolean; error?: string }> {
    try {
        logger.logInfo(`[Export EPUB] Starting export to ${filePath}`);

        const db = getDatabase();
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as Project | undefined;
        if (!project) return { success: false, error: 'Project not found' };

        let chapters = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY chapter_number ASC').all(projectId) as Chapter[];
        if (chapterIds?.length > 0) chapters = chapters.filter(c => chapterIds.includes(c.id));
        if (chapters.length === 0) return { success: false, error: 'No chapters to export' };

        const epubChapters = chapters.map(chapter => ({
            title: chapter.title || `Chapter ${chapter.chapter_number}`,
            content: chapter.content || '<p></p>'
        }));

        const options = {
            title: project.title || 'Untitled',
            author: project.author || 'Anonymous',
            publisher: 'Bouquine',
            description: project.blurb || project.synopsis || '',
        };

        logger.logInfo(`[Export EPUB] Building eBook structure for "${project.title}"`);
        logger.logInfo(`[Export EPUB] Options: ${JSON.stringify(options)}`);
        logger.logInfo(`[Export EPUB] Chapters count: ${epubChapters.length}`);

        // Dynamic import for epub-gen-memory (CommonJS module)
        // Check both default export and direct export (handling externalized module behavior)
        const epubModule = await import('epub-gen-memory');
        let epubGenerator = (epubModule.default || epubModule) as any;

        // Recursive unwrap strategy: Dig through layers of .default until we find a function
        let depth = 0;
        while (typeof epubGenerator !== 'function' && epubGenerator && epubGenerator.default && depth < 5) {
            logger.logInfo(`[Export EPUB] Unwrapping layer ${depth}: type is ${typeof epubGenerator}`);
            epubGenerator = epubGenerator.default;
            depth++;
        }
        // If still not a function, try to use createRequire as a fallback
        if (typeof epubGenerator !== 'function') {
            try {
                logger.logInfo('[Export EPUB] Standard import failed to find function. Trying createRequire fallback...');
                const { createRequire } = await import('module');
                // @ts-ignore
                const require = createRequire(import.meta.url);
                const lib = require('epub-gen-memory');
                epubGenerator = lib.default || lib;
            } catch (err) {
                logger.logError('[Export EPUB] createRequire fallback failed', err);
            }
        }
        // Ensure we have a function
        if (typeof epubGenerator !== 'function') {
            // Log the keys to help debug
            const keys = typeof epubGenerator === 'object' ? JSON.stringify(Object.keys(epubGenerator)) : 'primitive';
            throw new Error(`EPUB generator is not a function. It is: ${typeof epubGenerator} (Keys: ${keys})`);
        }

        logger.logInfo('[Export EPUB] Calling generator function...');

        // Call the function directly
        let content;
        try {
            content = await epubGenerator(options, epubChapters);
            logger.logInfo('[Export EPUB] Generator returned successfully');
        } catch (genError) {
            logger.logError('[Export EPUB] Generator Internal Error', genError);
            throw new Error(`EPUB generation failed internally: ${genError instanceof Error ? genError.message : String(genError)}`);
        }

        logger.logInfo(`[Export EPUB] Content type: ${typeof content}`);

        // Validate content before writing
        if (!content) {
            throw new Error('EPUB generation returned undefined content');
        }

        // If it's not a buffer, try to convert it if it's an arraybuffer (unlikely but possible)
        if (!(content instanceof Buffer)) {
            logger.logInfo('[Export EPUB] generic content received, checking type...');
            // @ts-ignore
            if (content instanceof ArrayBuffer) {
                content = Buffer.from(content);
            } else {
                throw new Error(`EPUB generation returned invalid type: ${typeof content}. Expected Buffer.`);
            }
        }

        await writeFile(filePath, content);
        logger.logInfo(`[Export EPUB] Success: ${filePath} (${content.length} bytes)`);
        return { success: true };

    } catch (error) {
        logger.logError('[Export EPUB] Fatal Error', error);
        return { success: false, error: error instanceof Error ? error.message : 'EPUB export failed' };
    }
}

// ═══════════════════════════════════════════════════════════════
// JSON EXPORT (Full Project Backup)
// ═══════════════════════════════════════════════════════════════

export async function exportToJson(
    projectId: string,
    filePath: string
): Promise<{ success: boolean; error?: string }> {
    try {
        logger.logInfo(`[Export JSON] Starting for project ${projectId}`);
        const db = getDatabase();
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as Project | undefined;
        if (!project) return { success: false, error: 'Project not found' };

        const chapters = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY chapter_number ASC').all(projectId) as Chapter[];
        const characters = db.prepare('SELECT * FROM characters WHERE project_id = ?').all(projectId) as Character[];
        const worldElements = db.prepare('SELECT * FROM world_elements WHERE project_id = ?').all(projectId) as WorldElement[];
        const styleGuide = db.prepare('SELECT * FROM style_guides WHERE project_id = ?').get(projectId) as StyleGuide | undefined;

        const exportData = { project, chapters, characters, worldElements, styleGuide, exportedAt: new Date().toISOString(), version: '1.0', app: 'Bouquine' };
        await writeFile(filePath, JSON.stringify(exportData, null, 2));
        logger.logInfo(`[Export JSON] Success: ${filePath}`);
        return { success: true };
    } catch (error) {
        logger.logError('[Export JSON] Failed', error);
        return { success: false, error: error instanceof Error ? error.message : 'JSON export failed' };
    }
}

// ═══════════════════════════════════════════════════════════════
// MARKDOWN EXPORT
// ═══════════════════════════════════════════════════════════════

export async function exportToMarkdown(projectId: string, chapterIds: string[], filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getDatabase();
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as Project | undefined;
        if (!project) return { success: false, error: 'Project not found' };

        let chapters = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY chapter_number ASC').all(projectId) as Chapter[];
        if (chapterIds?.length > 0) chapters = chapters.filter(c => chapterIds.includes(c.id));

        let markdown = `# ${project.title || 'Untitled'}\n\n**by ${project.author || 'Anonymous'}**\n\n`;
        if (project.genre) markdown += `*${project.genre}*\n\n`;
        if (project.blurb || project.synopsis) markdown += `> ${project.blurb || project.synopsis}\n\n`;
        markdown += `---\n\n`;

        for (const chapter of chapters) {
            markdown += `## ${chapter.title || `Chapter ${chapter.chapter_number}`}\n\n`;
            markdown += stripHtml(chapter.content || '') + '\n\n---\n\n';
        }
        await writeFile(filePath, markdown);
        return { success: true };
    } catch (error) {
        logger.logError('[Export MD] Failed', error);
        return { success: false, error: 'Markdown export failed' };
    }
}

// ═══════════════════════════════════════════════════════════════
// PLAIN TEXT EXPORT
// ═══════════════════════════════════════════════════════════════

export async function exportToTxt(projectId: string, chapterIds: string[], filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getDatabase();
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as Project | undefined;
        if (!project) return { success: false, error: 'Project not found' };

        let chapters = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY chapter_number ASC').all(projectId) as Chapter[];
        if (chapterIds?.length > 0) chapters = chapters.filter(c => chapterIds.includes(c.id));

        let text = `${(project.title || 'Untitled').toUpperCase()}\nby ${project.author || 'Anonymous'}\n\n`;
        text += `${'='.repeat(80)}\n\n`;

        for (const chapter of chapters) {
            text += `\n\n${(chapter.title || `Chapter ${chapter.chapter_number}`).toUpperCase()}\n\n`;
            const paragraphs = stripHtml(chapter.content || '').split(/\n\n+/).filter(p => p.trim());
            for (const para of paragraphs) text += `    ${para}\n\n`;
            text += `${'-'.repeat(80)}\n`;
        }
        await writeFile(filePath, text);
        return { success: true };
    } catch (error) {
        logger.logError('[Export TXT] Failed', error);
        return { success: false, error: 'Text export failed' };
    }
}