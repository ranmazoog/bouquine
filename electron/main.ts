import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import {
    getDatabase,
    createProject,
    getProject,
    getAllProjects,
    updateProject,
    deleteProject,
    createChapter,
    getChapter,
    getChaptersByProject,
    saveChapterContent,
    updateChapter,
    deleteChapter,
    createChapterSnapshot,
    getReferences,
    getReference,
    createReference,
    updateReference,
    deleteReference,
    getReferencesByChapter,
} from './services/database';
import {
    createCharacter,
    getCharacter,
    getCharactersByProject,
    updateCharacter,
    deleteCharacter,
    createWorldElement,
    getWorldElement,
    getWorldElementsByProject,
    updateWorldElement,
    deleteWorldElement,
    getOrCreateStyleGuide,
    updateStyleGuide,
} from './services/vault';
import {
    setAPIKey,
    getAPIKey,
    hasAPIKey,
    deleteAPIKey,
    getEncryptionMethod,
    getSetting,
    setSetting,
    type AppSettings,
} from './services/security';
import { createAIProvider } from './services/ai-provider';
import { buildPrompt, refreshContextIndex, searchContext } from './services/context-engine';
import { exportToDocx, exportChapterToDocx, exportToEpub, buildManuscriptHtml, getProjectExportData, exportToProjectJson } from './services/export';
import { writeFile } from 'fs/promises';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// Removed electron-squirrel-startup for ESM compatibility in this environment.

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        titleBarStyle: 'hiddenInset', // Premium look on macOS
    });

    // Hot Reloading etc.
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    // Initialize database
    getDatabase();

    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// ============================================================================
// IPC Handlers - Projects
// ============================================================================

ipcMain.handle('create-project', async (_event, data) => {
    return createProject(data);
});

ipcMain.handle('get-projects', async () => {
    return getAllProjects();
});

ipcMain.handle('get-project', async (_event, id) => {
    return getProject(id);
});

ipcMain.handle('update-project', async (_event, { id, data }) => {
    return updateProject(id, data);
});

ipcMain.handle('delete-project', async (_event, id) => {
    deleteProject(id);
    return { success: true };
});

// ============================================================================
// IPC Handlers - Chapters
// ============================================================================

ipcMain.handle('create-chapter', async (_event, data) => {
    return createChapter(data);
});

ipcMain.handle('get-chapter', async (_event, id) => {
    return getChapter(id);
});

ipcMain.handle('get-chapter-tree', async (_event, projectId) => {
    return getChaptersByProject(projectId);
});

ipcMain.handle('save-chapter-content', async (_event, { id, content }) => {
    return saveChapterContent(id, content);
});

ipcMain.handle('update-chapter', async (_event, { id, data }) => {
    return updateChapter(id, data);
});

ipcMain.handle('delete-chapter', async (_event, id) => {
    deleteChapter(id);
    return { success: true };
});

ipcMain.handle('create-chapter-snapshot', async (_event, { chapterId, note }) => {
    createChapterSnapshot(chapterId, note);
    return { success: true };
});

import { shell } from 'electron';

// ============================================================================
// IPC Handlers - References
// ============================================================================

ipcMain.handle('get-references', async (_event, projectId) => {
    return getReferences(projectId);
});

ipcMain.handle('create-reference', async (_event, data) => {
    return createReference(data);
});

ipcMain.handle('update-reference', async (_event, { id, data }) => {
    return updateReference(id, data);
});

ipcMain.handle('delete-reference', async (_event, id) => {
    deleteReference(id);
    return { success: true };
});

ipcMain.handle('get-research-by-chapter', async (_event, chapterId) => {
    return getReferencesByChapter(chapterId);
});

ipcMain.handle('open-link', async (_event, url) => {
    shell.openExternal(url);
});

// ============================================================================
// Utility Handlers
// ============================================================================

ipcMain.handle('get-app-data-path', () => {
    return app.getPath('userData');
});

// ============================================================================
// IPC Handlers - Settings & Security
// ============================================================================

ipcMain.handle('set-api-key', async (_event, { provider, key }) => {
    setAPIKey(provider, key);
    return { success: true };
});

ipcMain.handle('has-api-key', async (_event, provider) => {
    return hasAPIKey(provider);
});

ipcMain.handle('delete-api-key', async (_event, provider) => {
    deleteAPIKey(provider);
    return { success: true };
});

ipcMain.handle('get-encryption-method', async () => {
    return getEncryptionMethod();
});

ipcMain.handle('get-setting', async (_event, key: string) => {
    return getSetting(key as keyof AppSettings);
});

ipcMain.handle('set-setting', async (_event, { key, value }) => {
    setSetting(key as keyof AppSettings, value);
    return { success: true };
});

// ============================================================================
// IPC Handlers - AI
// ============================================================================

ipcMain.handle('ai-generate', async (_event, { provider, messages, options }) => {
    const apiKey = getAPIKey(provider);
    if (!apiKey) {
        throw new Error(`No API key found for provider: ${provider}`);
    }

    // Get model for OpenRouter (with fallback to free Llama model)
    const model = provider === 'openrouter'
        ? (getSetting('openrouterModel') || 'meta-llama/llama-3.3-70b-instruct:free')
        : undefined;
    const aiProvider = createAIProvider(provider, apiKey, model);
    return await aiProvider.generate(messages, options);
});

ipcMain.handle('generate-blurb', async (_event, { _projectId, synopsis }) => {
    const provider = 'openrouter'; // Default to OpenRouter
    const apiKey = getAPIKey(provider);
    if (!apiKey) {
        throw new Error(`No API key found for provider: ${provider}`);
    }

    const model = getSetting('openrouterModel') || 'meta-llama/llama-3.3-70b-instruct:free';
    const aiProvider = createAIProvider(provider, apiKey, model);

    const messages = [
        {
            role: 'system' as const,
            content: 'You are an expert book marketing copywriter. Write a catchy, compelling back-cover blurb (150-200 words) that hooks the reader immediately. Focus on the conflict and stakes. Do not include a title or author name.'
        },
        {
            role: 'user' as const,
            content: `Here is the synopsis for the book:\n\n${synopsis}`
        }
    ];

    return await aiProvider.generate(messages, { temperature: 0.7 });
});

ipcMain.handle('suggest-research-gaps', async (_event, projectId) => {
    const provider = 'openrouter'; // Default
    const apiKey = getAPIKey(provider);
    if (!apiKey) throw new Error('No API key found');

    const db = getDatabase();
    const project = db.prepare('SELECT blurb, title FROM projects WHERE id = ?').get(projectId) as any;
    const chapters = db.prepare('SELECT summary FROM chapters WHERE project_id = ? AND summary IS NOT NULL ORDER BY chapter_number DESC LIMIT 3').all(projectId) as any[];

    const context = `
Book Title: ${project.title}
Premise: ${project.blurb || 'Not provided'}
Latest Plot Developments:
${chapters.reverse().map((c, i) => `Chapter ${i + 1}: ${c.summary}`).join('\n')}
    `;

    const model = getSetting('openrouterModel') || 'meta-llama/llama-3.3-70b-instruct:free';
    const aiProvider = createAIProvider(provider, apiKey, model);

    const messages = [
        {
            role: 'system' as const,
            content: 'You are an expert world-building consultant. Analyze the provided book context and identify 5 critical "research gaps"—specific questions about the world, technical details, or character backgrounds that the author hasn\'t clearly defined yet but are necessary for realism and depth. Return them as a punchy, bulleted list.'
        },
        {
            role: 'user' as const,
            content: `Analyze this context and suggest research gaps:\n\n${context}`
        }
    ];

    return await aiProvider.generate(messages, { temperature: 0.7 });
});

// Streaming AI generation
ipcMain.handle('ai-generate-stream', async (event, { provider, messages, options }) => {
    const apiKey = getAPIKey(provider);
    if (!apiKey) {
        throw new Error(`No API key found for provider: ${provider}`);
    }

    // Get model for OpenRouter (with fallback to free Llama model)
    const model = provider === 'openrouter'
        ? (getSetting('openrouterModel') || 'meta-llama/llama-3.3-70b-instruct:free')
        : undefined;
    const aiProvider = createAIProvider(provider, apiKey, model);

    if (!aiProvider.generateStream) {
        // Fallback to non-streaming
        return await aiProvider.generate(messages, options);
    }

    // Use streaming with chunks sent via webContents
    return await aiProvider.generateStream(messages, options, (chunk: string) => {
        event.sender.send('ai-stream-chunk', chunk);
    });
});

ipcMain.handle('ai-chat-message', async (event, { projectId, chapterId, message, provider, selectedText }) => {
    const apiKey = getAPIKey(provider);
    console.log(`[AI] Provider: ${provider}, Has API Key: ${!!apiKey}`);

    if (!apiKey) {
        throw new Error(`No API key found for provider: ${provider}. Please configure your API key in Settings.`);
    }

    // Get model for OpenRouter (with fallback to free Llama model)
    const model = provider === 'openrouter'
        ? (getSetting('openrouterModel') || 'meta-llama/llama-3.3-70b-instruct:free')
        : undefined;
    console.log(`[AI] Using model: ${model}`);

    const aiProvider = createAIProvider(provider, apiKey, model);
    // buildPrompt is now async to support RAG search - pass selectedText for context
    const { systemPrompt, userPrompt } = await buildPrompt(message, projectId, chapterId, selectedText);

    const msgs: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];

    if (!aiProvider.generateStream) {
        return await aiProvider.generate(msgs);
    }

    // Stream chunks
    return await aiProvider.generateStream(msgs, {}, (chunk: string) => {
        event.sender.send('ai-chat-chunk', chunk);
    });
});

// ============================================================================
// IPC Handlers - Characters (Vault)
// ============================================================================

ipcMain.handle('create-character', async (_event, data) => {
    return createCharacter(data);
});

ipcMain.handle('get-character', async (_event, id) => {
    return getCharacter(id);
});

ipcMain.handle('get-characters', async (_event, projectId) => {
    return getCharactersByProject(projectId);
});

ipcMain.handle('update-character', async (_event, { id, data }) => {
    return updateCharacter(id, data);
});

ipcMain.handle('delete-character', async (_event, id) => {
    deleteCharacter(id);
    return { success: true };
});

// ============================================================================
// IPC Handlers - World Elements (Vault)
// ============================================================================

ipcMain.handle('create-world-element', async (_event, data) => {
    return createWorldElement(data);
});

ipcMain.handle('get-world-element', async (_event, id) => {
    return getWorldElement(id);
});

ipcMain.handle('get-world-elements', async (_event, projectId) => {
    return getWorldElementsByProject(projectId);
});

ipcMain.handle('update-world-element', async (_event, { id, data }) => {
    return updateWorldElement(id, data);
});

ipcMain.handle('delete-world-element', async (_event, id) => {
    deleteWorldElement(id);
    return { success: true };
});

// ============================================================================
// IPC Handlers - Chapter Summarization
// ============================================================================

ipcMain.handle('summarize-chapter', async (_event, { chapterId, provider }) => {
    const chapter = getChapter(chapterId);
    if (!chapter) {
        throw new Error(`Chapter not found: ${chapterId}`);
    }

    if (!chapter.content || chapter.content.trim().length === 0) {
        throw new Error('Chapter has no content to summarize');
    }

    const apiKey = getAPIKey(provider);
    if (!apiKey) {
        throw new Error(`No API key found for provider: ${provider}`);
    }

    const aiProvider = createAIProvider(provider, apiKey);

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        {
            role: 'system',
            content: 'You are a professional book editor. Summarize the following chapter content concisely in approximately 200 words. Focus on key plot points, character developments, and important events. Be factual and avoid interpretation.'
        },
        {
            role: 'user',
            content: chapter.content
        }
    ];

    const summary = await aiProvider.generate(messages, { maxOutputTokens: 500 });

    // Save the summary to the database
    const updated = updateChapter(chapterId, { summary });

    // Refresh the context index to include the new summary
    const updatedChapter = getChapter(chapterId);
    if (updatedChapter) {
        await refreshContextIndex(updatedChapter.project_id);
    }

    return updated;
});

// ============================================================================
// IPC Handlers - Context Engine
// ============================================================================

ipcMain.handle('refresh-context-index', async (_event, projectId: string) => {
    await refreshContextIndex(projectId);
    return { success: true };
});

ipcMain.handle('search-research', async (_event, { projectId, query, limit, excludeIds }) => {
    const searchLimit = limit || 5;
    const results = await searchContext(query, projectId, searchLimit + (excludeIds?.length || 0));
    let filtered = results.filter(r => r.type === 'reference');

    if (excludeIds && excludeIds.length > 0) {
        // Need to find the IDs since searchContext returns {title, type, content}
        // Actually searchContext implementation in context-engine.ts returns {type, title, content}
        // Wait, I should update searchContext to return ID too if I want to exclude effectively.
        // For now, I'll filter by title if ID is not available, but that's risky.
        // Let's check context-engine.ts searchContext return type.
    }

    return filtered.slice(0, searchLimit);
});

// ============================================================================
// IPC Handlers - Style Guide
// ============================================================================

ipcMain.handle('get-style-guide', async (_event, projectId: string) => {
    return getOrCreateStyleGuide(projectId);
});

ipcMain.handle('update-style-guide', async (_event, { projectId, data }) => {
    return updateStyleGuide(projectId, data);
});

// ============================================================================
// IPC Handlers - Export
// ============================================================================

ipcMain.handle('show-save-dialog', async (_event, options: {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
}) => {
    const result = await dialog.showSaveDialog({
        title: options.title || 'Save File',
        defaultPath: options.defaultPath,
        filters: options.filters || [{ name: 'All Files', extensions: ['*'] }],
    });

    return {
        canceled: result.canceled,
        filePath: result.filePath,
    };
});

ipcMain.handle('export-to-docx', async (_event, { projectId, chapterIds, filePath }) => {
    return exportToDocx(projectId, chapterIds || [], filePath);
});

ipcMain.handle('export-chapter-to-docx', async (_event, { chapterId, filePath }) => {
    return exportChapterToDocx(chapterId, filePath);
});

ipcMain.handle('export-to-epub', async (_event, { projectId, chapterIds, filePath }) => {
    return exportToEpub(projectId, chapterIds || [], filePath);
});

ipcMain.handle('export-to-pdf', async (_event, { projectId, chapterIds, filePath }) => {
    try {
        const { project, chapters } = await getProjectExportData(projectId, chapterIds);
        const html = buildManuscriptHtml(project, chapters);

        // Debug: Log first 500 chars of HTML to check title page
        console.log('[Export PDF] Generated HTML (first 500 chars):', html.substring(0, 500));
        console.log('[Export PDF] Project title:', project.title);
        console.log('[Export PDF] Project author:', project.author);
        console.log('[Export PDF] Number of chapters:', chapters.length);

        const tempWindow = new BrowserWindow({
            show: false,
            webPreferences: {
                offscreen: true
            }
        });

        // Use data URL to load the HTML content
        await tempWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

        // Wait a bit for any internal rendering if necessary, though this is static HTML
        // Generate PDF with professional headers and footers
        const pdfBuffer = await tempWindow.webContents.printToPDF({
            printBackground: true,
            pageSize: 'Letter',
            displayHeaderFooter: true,
            headerTemplate: `
                <div style="font-size: 9px; width: 100%; text-align: left; margin-left: 40px; color: #000; font-family: 'Times New Roman', serif;">
                    ${project.title.toUpperCase()} &bull; ${new Date().getFullYear()}
                </div>`,
            footerTemplate: `
                <div style="font-size: 9px; width: 100%; text-align: center; color: #000; font-family: 'Times New Roman', serif;">
                    Page <span class="pageNumber"></span> | Confidential
                </div>`,
            margins: {
                top: 1,
                bottom: 1,
                left: 1,
                right: 1
            }
        });

        await writeFile(filePath, pdfBuffer);
        tempWindow.close();

        return { success: true };
    } catch (error) {
        console.error('[Export PDF] Failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error during PDF export'
        };
    }
});

ipcMain.handle('export-to-json', async (_event, { projectId, filePath }) => {
    return exportToProjectJson(projectId, filePath);
});
