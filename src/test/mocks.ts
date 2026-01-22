import { vi } from 'vitest';

export const mockElectronAPI = {
    hasAPIKey: vi.fn(),
    setAPIKey: vi.fn(),
    deleteAPIKey: vi.fn(),
    getEncryptionMethod: vi.fn(),
    getSetting: vi.fn(),
    setSetting: vi.fn(),
    createProject: vi.fn(),
    getProjects: vi.fn(),
    getProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    createChapter: vi.fn(),
    getChapter: vi.fn(),
    getChapterTree: vi.fn(),
    saveChapterContent: vi.fn(),
    updateChapter: vi.fn(),
    renameChapter: vi.fn(),
    deleteChapter: vi.fn(),
    createChapterSnapshot: vi.fn(),
    aiGenerate: vi.fn(),
    aiGenerateStream: vi.fn(),
    onAIStreamChunk: vi.fn(),
    removeAIStreamListener: vi.fn(),
    aiChatMessage: vi.fn(),
    onAIChatChunk: vi.fn(),
    removeAIChatListener: vi.fn(),
    getAppDataPath: vi.fn(),
};

// @ts-ignore
global.window.electronAPI = mockElectronAPI;
