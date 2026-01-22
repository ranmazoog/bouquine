import { useCallback } from 'react';
import type { Chapter } from '../types/electron';

export function useChapter() {
    const createChapter = useCallback(async (data: {
        project_id: string;
        chapter_number: number;
        title?: string;
        outline?: string;
    }): Promise<Chapter> => {
        return await window.electronAPI.createChapter(data);
    }, []);

    const getChapter = useCallback(async (id: string): Promise<Chapter | null> => {
        return await window.electronAPI.getChapter(id);
    }, []);

    const getChapterTree = useCallback(async (projectId: string): Promise<Chapter[]> => {
        return await window.electronAPI.getChapterTree(projectId);
    }, []);

    const saveChapterContent = useCallback(async (id: string, content: string): Promise<Chapter> => {
        return await window.electronAPI.saveChapterContent(id, content);
    }, []);

    const updateChapter = useCallback(async (id: string, data: Partial<Chapter>): Promise<Chapter> => {
        return await window.electronAPI.updateChapter(id, data);
    }, []);

    const deleteChapter = useCallback(async (id: string): Promise<void> => {
        await window.electronAPI.deleteChapter(id);
    }, []);

    const createSnapshot = useCallback(async (chapterId: string, note?: string): Promise<void> => {
        await window.electronAPI.createChapterSnapshot(chapterId, note);
    }, []);

    return {
        createChapter,
        getChapter,
        getChapterTree,
        saveChapterContent,
        updateChapter,
        deleteChapter,
        createSnapshot,
    };
}
