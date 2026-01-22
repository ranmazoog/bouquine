import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore, useEditorStore } from '../stores/projectStore';
import type { Project } from '../types/electron';

describe('useProjectStore', () => {
    beforeEach(() => {
        useProjectStore.setState({
            projects: [],
            currentProject: null,
            chapters: []
        });
    });

    it('should add a project', () => {
        const project: Project = {
            id: '1',
            title: 'Test Project',
            target_word_count: 50000,
            status: 'draft',
            created_at: '',
            updated_at: ''
        };
        useProjectStore.getState().addProject(project);
        expect(useProjectStore.getState().projects).toContain(project);
    });

    it('should set current project', () => {
        const project: Project = {
            id: '1',
            title: 'Test Project',
            target_word_count: 50000,
            status: 'draft',
            created_at: '',
            updated_at: ''
        };
        useProjectStore.getState().setCurrentProject(project);
        expect(useProjectStore.getState().currentProject).toBe(project);
    });
});

describe('useEditorStore', () => {
    beforeEach(() => {
        useEditorStore.setState({
            currentChapter: null,
            saveStatus: 'saved',
            isFocusMode: false
        });
    });

    it('should toggle focus mode', () => {
        expect(useEditorStore.getState().isFocusMode).toBe(false);
        useEditorStore.getState().setFocusMode(true);
        expect(useEditorStore.getState().isFocusMode).toBe(true);
    });
});
