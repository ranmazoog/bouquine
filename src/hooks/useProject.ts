import { useCallback } from 'react';
import type { Project } from '../types/electron';

export function useProject() {
    const createProject = useCallback(async (data: {
        title: string;
        genre?: string;
        audience?: string;
        target_word_count?: number;
    }): Promise<Project> => {
        return await window.electronAPI.createProject(data);
    }, []);

    const getProjects = useCallback(async (): Promise<Project[]> => {
        return await window.electronAPI.getProjects();
    }, []);

    const getProject = useCallback(async (id: string): Promise<Project | null> => {
        return await window.electronAPI.getProject(id);
    }, []);

    const updateProject = useCallback(async (id: string, data: Partial<Project>): Promise<Project> => {
        return await window.electronAPI.updateProject(id, data);
    }, []);

    const deleteProject = useCallback(async (id: string): Promise<void> => {
        await window.electronAPI.deleteProject(id);
    }, []);

    return {
        createProject,
        getProjects,
        getProject,
        updateProject,
        deleteProject,
    };
}
