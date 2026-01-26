import { writeFile } from 'fs/promises';
import { Document, Packer, Paragraph, TextRun, PageBreak, AlignmentType } from 'docx';
import { getDatabase } from './database';

interface Chapter {
    id: string;
    project_id: string;
    chapter_number: number;
    title?: string;
    content: string;
    word_count?: number;
}

interface Project {
    id: string;
    title: string;
    genre?: string;
    author?: string;
    synopsis?: string;
    blurb?: string;
    created_at?: string;
    updated_at?: string;
}

function escapeHtml(text: string | undefined | null): string {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function cleanChapterContent(html: string): string {
    if (!html || html.trim() === '') return '<p>&nbsp;</p>';

    let cleaned = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<img[^>]*>/gi, '')
        .replace(/<div[^>]*>/gi, '<p>')
        .replace(/<\/div>/gi, '</p>')
        .replace(/\s+(class|id|style|data-[a-z-]+|contenteditable|spellcheck)="[^"]*"/gi, '')
        .replace(/(<br\s*\/?>\s*){3,}/gi, '</p><p>')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // eslint-disable-line no-control-regex
        .trim();

    if (!cleaned.startsWith('<p') && !cleaned.startsWith('<h')) {
        cleaned = `<p>${cleaned}</p>`;
    }

    return cleaned;
}

function formatDate(dateString?: string): string {
    if (!dateString) return new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

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

function buildManuscriptHtml(project: Project, chapters: Chapter[]): string {
    const sortedChapters = [...chapters].sort((a, b) => a.chapter_number - b.chapter_number);

    const title = escapeHtml(project.title) || 'Untitled';
    const author = escapeHtml(project.author) || 'Anonymous';
    const genre = escapeHtml(project.genre);
    const blurb = escapeHtml(project.blurb || project.synopsis);
    const createdDate = formatDate(project.created_at);
    const updatedDate = formatDate(project.updated_at);
    const exportDate = formatDate();

    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5;">

    <div style="text-align: center; padding-top: 200px;">
        <p style="font-size: 28pt; font-weight: bold; margin-bottom: 48pt;">
            ${title.toUpperCase()}
        </p>
        
        <p style="font-size: 16pt; margin-bottom: 12pt;">
            by
        </p>
        
        <p style="font-size: 18pt; font-weight: bold; margin-bottom: 48pt;">
            ${author}
        </p>
        
        ${genre ? `<p style="font-size: 12pt; color: #666; margin-bottom: 24pt;">${genre}</p>` : ''}
        
        ${blurb ? `
        <div style="max-width: 400px; margin: 48pt auto; text-align: center;">
            <p style="font-size: 11pt; font-style: italic; line-height: 1.6;">
                ${blurb}
            </p>
        </div>
        ` : ''}
        
        <div style="margin-top: 100px;">
            <p style="font-size: 10pt; color: #888;">
                Created: ${createdDate}
            </p>
            <p style="font-size: 10pt; color: #888;">
                Last Updated: ${updatedDate}
            </p>
            <p style="font-size: 10pt; color: #888;">
                Exported: ${exportDate}
            </p>
        </div>
    </div>
    
    <p style="page-break-after: always;">&nbsp;</p>
`;

    for (const chapter of sortedChapters) {
        const chapterTitle = escapeHtml(chapter.title) || `Chapter ${chapter.chapter_number}`;
        const content = cleanChapterContent(chapter.content);

        html += `
    <div>
        <p style="text-align: center; font-size: 14pt; font-weight: bold; margin-top: 48pt; margin-bottom: 24pt; text-transform: uppercase;">
            ${chapterTitle}
        </p>
        
        <div style="text-indent: 0.5in; text-align: justify;">
            ${content}
        </div>
    </div>
    
    <p style="page-break-after: always;">&nbsp;</p>
`;
    }

    html += `
</body>
</html>`;

    return html;
}

export async function exportToDocx(
    projectId: string,
    chapterIds: string[],
    filePath: string
): Promise<{ success: boolean; error?: string }> {
    // Redirect to the more reliable direct export function
    return exportToDocxDirect(projectId, chapterIds, filePath);
}

export async function exportChapterToDocx(
    chapterId: string,
    filePath: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getDatabase();
        const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(chapterId) as Chapter | undefined;

        if (!chapter) {
            return { success: false, error: 'Chapter not found' };
        }

        return exportToDocx(chapter.project_id, [chapterId], filePath);
    } catch (error) {
        console.error('[Export] Chapter export failed:', error);
        return { success: false, error: 'Failed to export chapter' };
    }
}

// Direct DOCX export using docx package (more reliable, no HTML conversion)
export async function exportToDocxDirect(
    projectId: string,
    chapterIds: string[],
    filePath: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getDatabase();

        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as Project | undefined;
        if (!project) return { success: false, error: 'Project not found' };

        console.log('[Export Direct] Project:', project.title);

        let chapters = db.prepare(
            'SELECT * FROM chapters WHERE project_id = ? ORDER BY chapter_number ASC'
        ).all(projectId) as Chapter[];

        if (chapterIds?.length > 0) {
            chapters = chapters.filter(c => chapterIds.includes(c.id));
        }

        console.log('[Export Direct] Chapters to export:', chapters.length);

        if (chapters.length === 0) {
            return { success: false, error: 'No chapters to export' };
        }

        // Build document sections
        const children: Paragraph[] = [];

        // Helper function to format dates
        const formatDate = (dateString?: string): string => {
            if (!dateString) return '';
            try {
                return new Date(dateString).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });
            } catch {
                return dateString;
            }
        };

        // ═══════════════════════════════════════════════════════════════
        // TITLE PAGE
        // ═══════════════════════════════════════════════════════════════
        // Add spacing
        for (let i = 0; i < 8; i++) {
            children.push(new Paragraph({ text: '' }));
        }

        // Title
        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: (project.title || 'Untitled').toUpperCase(),
                        bold: true,
                        size: 56, // 28pt
                        font: 'Times New Roman'
                    })
                ],
                alignment: AlignmentType.CENTER
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
                children: [
                    new TextRun({
                        text: 'by',
                        size: 28,
                        font: 'Times New Roman'
                    })
                ],
                alignment: AlignmentType.CENTER
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
                children: [
                    new TextRun({
                        text: project.author || 'Anonymous',
                        bold: true,
                        size: 32,
                        font: 'Times New Roman'
                    })
                ],
                alignment: AlignmentType.CENTER
            })
        );

        // Genre
        if (project.genre) {
            children.push(
                new Paragraph({ text: '' }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: project.genre,
                            size: 24,
                            font: 'Times New Roman',
                            color: '666666'
                        })
                    ],
                    alignment: AlignmentType.CENTER
                })
            );
        }

        // Blurb/Synopsis
        const blurbText = project.blurb || project.synopsis;
        if (blurbText) {
            children.push(
                new Paragraph({ text: '' }),
                new Paragraph({ text: '' }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: blurbText,
                            italics: true,
                            size: 22,
                            font: 'Times New Roman'
                        })
                    ],
                    alignment: AlignmentType.CENTER
                })
            );
        }

        // Dates
        children.push(
            new Paragraph({ text: '' }),
            new Paragraph({ text: '' }),
            new Paragraph({ text: '' }),
            new Paragraph({
                children: [new TextRun({
                    text: `Created: ${formatDate(project.created_at)}`,
                    size: 20,
                    color: '888888',
                    font: 'Times New Roman'
                })],
                alignment: AlignmentType.CENTER
            }),
            new Paragraph({
                children: [new TextRun({
                    text: `Last Updated: ${formatDate(project.updated_at)}`,
                    size: 20,
                    color: '888888',
                    font: 'Times New Roman'
                })],
                alignment: AlignmentType.CENTER
            }),
            new Paragraph({
                children: [new TextRun({
                    text: `Exported: ${formatDate(new Date().toISOString())}`,
                    size: 20,
                    color: '888888',
                    font: 'Times New Roman'
                })],
                alignment: AlignmentType.CENTER
            }),
            new Paragraph({
                children: [new PageBreak()]
            })
        );

        // ═══════════════════════════════════════════════════════════════
        // CHAPTERS
        // ═══════════════════════════════════════════════════════════════
        for (const chapter of chapters) {
            const chapterTitle = chapter.title || `Chapter ${chapter.chapter_number}`;

            // Chapter title with spacing
            children.push(
                new Paragraph({ text: '' }),
                new Paragraph({ text: '' }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: chapterTitle.toUpperCase(),
                            bold: true,
                            size: 28,
                            font: 'Times New Roman'
                        })
                    ],
                    alignment: AlignmentType.CENTER
                }),
                new Paragraph({ text: '' })
            );

            // Chapter content - strip HTML and split into paragraphs
            let content = chapter.content || '';
            content = content
                .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')  // Convert </p><p> to double newline
                .replace(/<br\s*\/?>/gi, '\n')          // Convert <br> to newline
                .replace(/<[^>]*>/g, '')                 // Strip remaining HTML
                .replace(/&nbsp;/g, ' ')                 // Convert nbsp
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .trim();

            const paragraphs = content.split(/\n\n+/).filter(p => p.trim());

            for (const para of paragraphs) {
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: para.trim(),
                                size: 24,
                                font: 'Times New Roman'
                            })
                        ],
                        alignment: AlignmentType.JUSTIFIED,
                        indent: { firstLine: 720 } // 0.5 inch
                    })
                );
            }

            // Page break after chapter (except last chapter)
            if (chapter !== chapters[chapters.length - 1]) {
                children.push(
                    new Paragraph({
                        children: [new PageBreak()]
                    })
                );
            }
        }

        // Create document
        const doc = new Document({
            sections: [{
                properties: {
                    page: {
                        margin: {
                            top: 1440,    // 1 inch
                            right: 1440,
                            bottom: 1440,
                            left: 1440
                        }
                    }
                },
                children: children
            }]
        });

        // Generate buffer
        console.log('[Export Direct] Generating DOCX buffer...');
        const buffer = await Packer.toBuffer(doc);

        console.log('[Export Direct] Buffer size:', buffer.length);

        // Validate ZIP signature
        const header = buffer.slice(0, 2).toString('hex');
        console.log('[Export Direct] File header:', header);

        if (header !== '504b') {
            console.error('[Export Direct] Invalid DOCX header');
            return { success: false, error: 'Generated file is not a valid DOCX' };
        }

        await writeFile(filePath, buffer);

        console.log(`[Export Direct] Success: ${filePath} (${buffer.length} bytes)`);
        return { success: true };

    } catch (error) {
        console.error('[Export Direct] Failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown export error'
        };
    }
}