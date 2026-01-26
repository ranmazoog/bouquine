export interface Project {
    id: string;
    title: string;
    genre?: string;
    audience?: string;
    target_word_count: number;
    author?: string;
    blurb?: string;
    synopsis?: string;
    status: 'draft' | 'completed' | 'archived';
    last_visited_chapter_id?: string;
    created_at: string;
    updated_at: string;
}

export interface Reference {
    id: string;
    project_id: string;
    title: string;
    content?: string;
    type: 'link' | 'note';
    url?: string;
    related_elements?: string; // JSON string: [{id: 'char-xxx', type: 'character'}]
    tag?: string;
    created_at: string;
    updated_at: string;
}

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

export interface WorldElement {
    id: string;
    project_id: string;
    category: string;
    name: string;
    description?: string;
    created_at: string;
    updated_at: string;
}

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

export interface AIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AIGenerateOptions {
    temperature?: number;
    maxOutputTokens?: number;
    jsonMode?: boolean;
}

export type AIProvider = 'openai' | 'anthropic' | 'openrouter';

export interface IElectronAPI {
    // Projects
    createProject: (data: {
        title: string;
        genre?: string;
        audience?: string;
        target_word_count?: number;
    }) => Promise<Project>;
    getProjects: () => Promise<Project[]>;
    getProject: (id: string) => Promise<Project | null>;
    updateProject: (id: string, data: Partial<Project>) => Promise<Project>;
    deleteProject: (id: string) => Promise<{ success: boolean }>;

    // Chapters
    createChapter: (data: {
        project_id: string;
        chapter_number: number;
        title?: string;
        outline?: string;
    }) => Promise<Chapter>;
    getChapter: (id: string) => Promise<Chapter | null>;
    getChapterTree: (projectId: string) => Promise<Chapter[]>;
    saveChapterContent: (id: string, content: string) => Promise<Chapter>;
    updateChapter: (id: string, data: Partial<Chapter>) => Promise<Chapter>;
    renameChapter: (id: string, title: string) => Promise<Chapter>;
    deleteChapter: (id: string) => Promise<{ success: boolean }>;
    createChapterSnapshot: (chapterId: string, note?: string) => Promise<{ success: boolean }>;

    // Characters (Vault)
    createCharacter: (data: {
        project_id: string;
        name: string;
        role?: string;
        description?: string;
        backstory?: string;
    }) => Promise<Character>;
    getCharacter: (id: string) => Promise<Character | null>;
    getCharacters: (projectId: string) => Promise<Character[]>;
    updateCharacter: (id: string, data: Partial<Character>) => Promise<Character>;
    deleteCharacter: (id: string) => Promise<{ success: boolean }>;

    // World Elements (Vault)
    createWorldElement: (data: {
        project_id: string;
        name: string;
        category: string;
        description?: string;
    }) => Promise<WorldElement>;
    getWorldElement: (id: string) => Promise<WorldElement | null>;
    getWorldElements: (projectId: string) => Promise<WorldElement[]>;
    updateWorldElement: (id: string, data: Partial<WorldElement>) => Promise<WorldElement>;
    deleteWorldElement: (id: string) => Promise<{ success: boolean }>;

    // Settings & Security
    setAPIKey: (provider: string, key: string) => Promise<{ success: boolean }>;
    hasAPIKey: (provider: string) => Promise<boolean>;
    deleteAPIKey: (provider: string) => Promise<{ success: boolean }>;
    getEncryptionMethod: () => Promise<'keychain' | 'base64'>;
    getSetting: (key: string) => Promise<any>;
    setSetting: (key: string, value: any) => Promise<{ success: boolean }>;

    // AI
    aiGenerate: (provider: AIProvider, messages: AIMessage[], options?: AIGenerateOptions) => Promise<string>;
    aiGenerateStream: (provider: AIProvider, messages: AIMessage[], options?: AIGenerateOptions) => Promise<string>;
    onAIStreamChunk: (callback: (chunk: string) => void) => void;
    removeAIStreamListener: () => void;

    // Context Engine Chat
    aiChatMessage: (payload: { projectId: string; chapterId: string; message: string; provider: string; selectedText?: string | null }) => Promise<string>;
    onAIChatChunk: (callback: (chunk: string) => void) => void;
    removeAIChatListener: () => void;

    // Chapter Summarization
    summarizeChapter: (chapterId: string, provider: string) => Promise<Chapter>;

    // Project Utilities
    generateBlurb: (projectId: string, synopsis: string) => Promise<string>;

    // References (Research)
    getReferences: (projectId: string) => Promise<Reference[]>;
    createReference: (data: Partial<Reference> & { project_id: string; title: string; type: 'link' | 'note' }) => Promise<Reference>;
    updateReference: (id: string, data: Partial<Reference>) => Promise<Reference>;
    deleteReference: (id: string) => Promise<{ success: boolean }>;
    suggestResearchGaps: (projectId: string) => Promise<string>;
    getResearchByChapter: (chapterId: string) => Promise<Reference[]>;
    openLink: (url: string) => Promise<void>;

    // Context Engine
    refreshContextIndex: (projectId: string) => Promise<{ success: boolean }>;
    searchResearch: (projectId: string, query: string, limit?: number, excludeIds?: string[]) => Promise<Array<{ title: string; type: string; content: string }>>;

    // Style Guide
    getStyleGuide: (projectId: string) => Promise<StyleGuide>;
    updateStyleGuide: (projectId: string, data: Partial<StyleGuide>) => Promise<StyleGuide>;

    // Export
    showSaveDialog: (options: {
        title?: string;
        defaultPath?: string;
        filters?: Array<{ name: string; extensions: string[] }>;
    }) => Promise<{ canceled: boolean; filePath?: string }>;
    exportToDocx: (projectId: string, chapterIds: string[], filePath: string) =>
        Promise<{ success: boolean; error?: string }>;
    exportChapterToDocx: (chapterId: string, filePath: string) =>
        Promise<{ success: boolean; error?: string }>;
    exportToPdf: (projectId: string, chapterIds: string[], filePath: string) =>
        Promise<{ success: boolean; error?: string }>;
    exportToEpub: (projectId: string, chapterIds: string[], filePath: string) =>
        Promise<{ success: boolean; error?: string }>;
    exportToJson: (projectId: string, filePath: string) =>
        Promise<{ success: boolean; error?: string }>;
    exportToMarkdown: (projectId: string, chapterIds: string[], filePath: string) =>
        Promise<{ success: boolean; error?: string }>;
    exportToTxt: (projectId: string, chapterIds: string[], filePath: string) =>
        Promise<{ success: boolean; error?: string }>;

    // Intelligence Features
    auditChapterConsistency: (payload: { projectId: string; chapterId: string; provider: string }) => Promise<string>;
    analyzeAuthorStyle: (payload: { projectId: string; provider: string }) => Promise<string>;

    // Utility
    getAppDataPath: () => Promise<string>;
    openLogsFolder: () => Promise<{ success: boolean }>;
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}
