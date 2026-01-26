import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    // Projects
    createProject: (data: any) => ipcRenderer.invoke('create-project', data),
    getProjects: () => ipcRenderer.invoke('get-projects'),
    getProject: (id: string) => ipcRenderer.invoke('get-project', id),
    updateProject: (id: string, data: any) => ipcRenderer.invoke('update-project', { id, data }),
    deleteProject: (id: string) => ipcRenderer.invoke('delete-project', id),

    // Chapters
    createChapter: (data: any) => ipcRenderer.invoke('create-chapter', data),
    getChapter: (id: string) => ipcRenderer.invoke('get-chapter', id),
    getChapterTree: (projectId: string) => ipcRenderer.invoke('get-chapter-tree', projectId),
    saveChapterContent: (id: string, content: string) => ipcRenderer.invoke('save-chapter-content', { id, content }),
    updateChapter: (id: string, data: any) => ipcRenderer.invoke('update-chapter', { id, data }),
    renameChapter: (id: string, title: string) => ipcRenderer.invoke('update-chapter', { id, data: { title } }),
    deleteChapter: (id: string) => ipcRenderer.invoke('delete-chapter', id),
    createChapterSnapshot: (chapterId: string, note?: string) => ipcRenderer.invoke('create-chapter-snapshot', { chapterId, note }),

    // Characters (Vault)
    createCharacter: (data: any) => ipcRenderer.invoke('create-character', data),
    getCharacter: (id: string) => ipcRenderer.invoke('get-character', id),
    getCharacters: (projectId: string) => ipcRenderer.invoke('get-characters', projectId),
    updateCharacter: (id: string, data: any) => ipcRenderer.invoke('update-character', { id, data }),
    deleteCharacter: (id: string) => ipcRenderer.invoke('delete-character', id),

    // World Elements (Vault)
    createWorldElement: (data: any) => ipcRenderer.invoke('create-world-element', data),
    getWorldElement: (id: string) => ipcRenderer.invoke('get-world-element', id),
    getWorldElements: (projectId: string) => ipcRenderer.invoke('get-world-elements', projectId),
    updateWorldElement: (id: string, data: any) => ipcRenderer.invoke('update-world-element', { id, data }),
    deleteWorldElement: (id: string) => ipcRenderer.invoke('delete-world-element', id),

    // Settings & Security
    setAPIKey: (provider: string, key: string) => ipcRenderer.invoke('set-api-key', { provider, key }),
    hasAPIKey: (provider: string) => ipcRenderer.invoke('has-api-key', provider),
    deleteAPIKey: (provider: string) => ipcRenderer.invoke('delete-api-key', provider),
    getEncryptionMethod: () => ipcRenderer.invoke('get-encryption-method'),
    getSetting: (key: string) => ipcRenderer.invoke('get-setting', key),
    setSetting: (key: string, value: any) => ipcRenderer.invoke('set-setting', { key, value }),

    // AI
    aiGenerate: (provider: string, messages: any[], options?: any) => ipcRenderer.invoke('ai-generate', { provider, messages, options }),
    aiGenerateStream: (provider: string, messages: any[], options?: any) => ipcRenderer.invoke('ai-generate-stream', { provider, messages, options }),
    onAIStreamChunk: (callback: (chunk: string) => void) => {
        ipcRenderer.on('ai-stream-chunk', (_, chunk) => callback(chunk));
    },
    removeAIStreamListener: () => {
        ipcRenderer.removeAllListeners('ai-stream-chunk');
    },

    // Context Engine Chat
    aiChatMessage: (payload: { projectId: string; chapterId: string; message: string; provider: string }) => ipcRenderer.invoke('ai-chat-message', payload),
    onAIChatChunk: (callback: (chunk: string) => void) => {
        ipcRenderer.on('ai-chat-chunk', (_, chunk) => callback(chunk));
    },
    removeAIChatListener: () => {
        ipcRenderer.removeAllListeners('ai-chat-chunk');
    },

    // Chapter Summarization
    summarizeChapter: (chapterId: string, provider: string) => ipcRenderer.invoke('summarize-chapter', { chapterId, provider }),

    // Project Utilities
    generateBlurb: (projectId: string, synopsis: string) => ipcRenderer.invoke('generate-blurb', { projectId, synopsis }),

    // References (Research)
    getReferences: (projectId: string) => ipcRenderer.invoke('get-references', projectId),
    createReference: (data: any) => ipcRenderer.invoke('create-reference', data),
    updateReference: (id: string, data: any) => ipcRenderer.invoke('update-reference', { id, data }),
    deleteReference: (id: string) => ipcRenderer.invoke('delete-reference', id),
    suggestResearchGaps: (projectId: string) => ipcRenderer.invoke('suggest-research-gaps', projectId),
    getResearchByChapter: (chapterId: string) => ipcRenderer.invoke('get-research-by-chapter', chapterId),
    openLink: (url: string) => ipcRenderer.invoke('open-link', url),

    // Context Engine
    refreshContextIndex: (projectId: string) => ipcRenderer.invoke('refresh-context-index', projectId),
    searchResearch: (projectId: string, query: string, limit?: number, excludeIds?: string[]) => ipcRenderer.invoke('search-research', { projectId, query, limit, excludeIds }),

    // Style Guide
    getStyleGuide: (projectId: string) => ipcRenderer.invoke('get-style-guide', projectId),
    updateStyleGuide: (projectId: string, data: any) => ipcRenderer.invoke('update-style-guide', { projectId, data }),

    // Export
    showSaveDialog: (options: {
        title?: string;
        defaultPath?: string;
        filters?: Array<{ name: string; extensions: string[] }>;
    }) => ipcRenderer.invoke('show-save-dialog', options),
    exportToDocx: (projectId: string, chapterIds: string[], filePath: string) =>
        ipcRenderer.invoke('export-to-docx', { projectId, chapterIds, filePath }),
    exportChapterToDocx: (chapterId: string, filePath: string) =>
        ipcRenderer.invoke('export-chapter-to-docx', { chapterId, filePath }),
    exportToPdf: (projectId: string, chapterIds: string[], filePath: string) =>
        ipcRenderer.invoke('export-to-pdf', { projectId, chapterIds, filePath }),
    exportToEpub: (projectId: string, chapterIds: string[], filePath: string) =>
        ipcRenderer.invoke('export-to-epub', { projectId, chapterIds, filePath }),
    exportToJson: (projectId: string, filePath: string) =>
        ipcRenderer.invoke('export-to-json', { projectId, filePath }),
    exportToMarkdown: (projectId: string, chapterIds: string[], filePath: string) =>
        ipcRenderer.invoke('export-to-markdown', { projectId, chapterIds, filePath }),
    exportToTxt: (projectId: string, chapterIds: string[], filePath: string) =>
        ipcRenderer.invoke('export-to-txt', { projectId, chapterIds, filePath }),

    // Intelligence Features
    auditChapterConsistency: (payload: any) => ipcRenderer.invoke('audit-chapter-consistency', payload),
    analyzeAuthorStyle: (payload: any) => ipcRenderer.invoke('analyze-author-style', payload),

    // Utility
    getAppDataPath: () => ipcRenderer.invoke('get-app-data-path'),
    openLogsFolder: () => ipcRenderer.invoke('open-logs-folder'),
});
