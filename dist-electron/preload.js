"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // Projects
  createProject: (data) => electron.ipcRenderer.invoke("create-project", data),
  getProjects: () => electron.ipcRenderer.invoke("get-projects"),
  getProject: (id) => electron.ipcRenderer.invoke("get-project", id),
  updateProject: (id, data) => electron.ipcRenderer.invoke("update-project", { id, data }),
  deleteProject: (id) => electron.ipcRenderer.invoke("delete-project", id),
  // Chapters
  createChapter: (data) => electron.ipcRenderer.invoke("create-chapter", data),
  getChapter: (id) => electron.ipcRenderer.invoke("get-chapter", id),
  getChapterTree: (projectId) => electron.ipcRenderer.invoke("get-chapter-tree", projectId),
  saveChapterContent: (id, content) => electron.ipcRenderer.invoke("save-chapter-content", { id, content }),
  updateChapter: (id, data) => electron.ipcRenderer.invoke("update-chapter", { id, data }),
  renameChapter: (id, title) => electron.ipcRenderer.invoke("update-chapter", { id, data: { title } }),
  deleteChapter: (id) => electron.ipcRenderer.invoke("delete-chapter", id),
  createChapterSnapshot: (chapterId, note) => electron.ipcRenderer.invoke("create-chapter-snapshot", { chapterId, note }),
  // Characters (Vault)
  createCharacter: (data) => electron.ipcRenderer.invoke("create-character", data),
  getCharacter: (id) => electron.ipcRenderer.invoke("get-character", id),
  getCharacters: (projectId) => electron.ipcRenderer.invoke("get-characters", projectId),
  updateCharacter: (id, data) => electron.ipcRenderer.invoke("update-character", { id, data }),
  deleteCharacter: (id) => electron.ipcRenderer.invoke("delete-character", id),
  // World Elements (Vault)
  createWorldElement: (data) => electron.ipcRenderer.invoke("create-world-element", data),
  getWorldElement: (id) => electron.ipcRenderer.invoke("get-world-element", id),
  getWorldElements: (projectId) => electron.ipcRenderer.invoke("get-world-elements", projectId),
  updateWorldElement: (id, data) => electron.ipcRenderer.invoke("update-world-element", { id, data }),
  deleteWorldElement: (id) => electron.ipcRenderer.invoke("delete-world-element", id),
  // Settings & Security
  setAPIKey: (provider, key) => electron.ipcRenderer.invoke("set-api-key", { provider, key }),
  hasAPIKey: (provider) => electron.ipcRenderer.invoke("has-api-key", provider),
  deleteAPIKey: (provider) => electron.ipcRenderer.invoke("delete-api-key", provider),
  getEncryptionMethod: () => electron.ipcRenderer.invoke("get-encryption-method"),
  getSetting: (key) => electron.ipcRenderer.invoke("get-setting", key),
  setSetting: (key, value) => electron.ipcRenderer.invoke("set-setting", { key, value }),
  // AI
  aiGenerate: (provider, messages, options) => electron.ipcRenderer.invoke("ai-generate", { provider, messages, options }),
  aiGenerateStream: (provider, messages, options) => electron.ipcRenderer.invoke("ai-generate-stream", { provider, messages, options }),
  onAIStreamChunk: (callback) => {
    electron.ipcRenderer.on("ai-stream-chunk", (_, chunk) => callback(chunk));
  },
  removeAIStreamListener: () => {
    electron.ipcRenderer.removeAllListeners("ai-stream-chunk");
  },
  // Context Engine Chat
  aiChatMessage: (payload) => electron.ipcRenderer.invoke("ai-chat-message", payload),
  onAIChatChunk: (callback) => {
    electron.ipcRenderer.on("ai-chat-chunk", (_, chunk) => callback(chunk));
  },
  removeAIChatListener: () => {
    electron.ipcRenderer.removeAllListeners("ai-chat-chunk");
  },
  // Chapter Summarization
  summarizeChapter: (chapterId, provider) => electron.ipcRenderer.invoke("summarize-chapter", { chapterId, provider }),
  // Project Utilities
  generateBlurb: (projectId, synopsis) => electron.ipcRenderer.invoke("generate-blurb", { projectId, synopsis }),
  // References (Research)
  getReferences: (projectId) => electron.ipcRenderer.invoke("get-references", projectId),
  createReference: (data) => electron.ipcRenderer.invoke("create-reference", data),
  updateReference: (id, data) => electron.ipcRenderer.invoke("update-reference", { id, data }),
  deleteReference: (id) => electron.ipcRenderer.invoke("delete-reference", id),
  suggestResearchGaps: (projectId) => electron.ipcRenderer.invoke("suggest-research-gaps", projectId),
  getResearchByChapter: (chapterId) => electron.ipcRenderer.invoke("get-research-by-chapter", chapterId),
  openLink: (url) => electron.ipcRenderer.invoke("open-link", url),
  // Context Engine
  refreshContextIndex: (projectId) => electron.ipcRenderer.invoke("refresh-context-index", projectId),
  searchResearch: (projectId, query, limit, excludeIds) => electron.ipcRenderer.invoke("search-research", { projectId, query, limit, excludeIds }),
  // Style Guide
  getStyleGuide: (projectId) => electron.ipcRenderer.invoke("get-style-guide", projectId),
  updateStyleGuide: (projectId, data) => electron.ipcRenderer.invoke("update-style-guide", { projectId, data }),
  // Export
  showSaveDialog: (options) => electron.ipcRenderer.invoke("show-save-dialog", options),
  exportToDocx: (projectId, chapterIds, filePath) => electron.ipcRenderer.invoke("export-to-docx", { projectId, chapterIds, filePath }),
  exportChapterToDocx: (chapterId, filePath) => electron.ipcRenderer.invoke("export-chapter-to-docx", { chapterId, filePath }),
  exportToPdf: (projectId, chapterIds, filePath) => electron.ipcRenderer.invoke("export-to-pdf", { projectId, chapterIds, filePath }),
  exportToEpub: (projectId, chapterIds, filePath) => electron.ipcRenderer.invoke("export-to-epub", { projectId, chapterIds, filePath }),
  exportToJson: (projectId, filePath) => electron.ipcRenderer.invoke("export-to-json", { projectId, filePath }),
  // Utility
  getAppDataPath: () => electron.ipcRenderer.invoke("get-app-data-path")
});
