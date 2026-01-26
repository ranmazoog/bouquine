import { create } from 'zustand';
import type { Project, Chapter, Character, WorldElement } from '../types/electron';

export type SidebarTab = 'overview' | 'chapters' | 'synopsis' | 'characters' | 'world' | 'styleguide' | 'research';

interface EditorState {
    currentChapter: Chapter | null;
    saveStatus: 'saved' | 'saving' | 'unsaved';
    isFocusMode: boolean;
    activeSidebarTab: SidebarTab;
    chaptersViewMode: 'list' | 'corkboard';
    pendingInsertion: string | null;
    lastSelection: { from: number; to: number; text: string } | null;
    activeBeat: string | null;
    pendingAudit: boolean;
    setCurrentChapter: (chapter: Chapter | null) => void;
    setSaveStatus: (status: 'saved' | 'saving' | 'unsaved') => void;
    setFocusMode: (isFocus: boolean) => void;
    setActiveSidebarTab: (tab: SidebarTab) => void;
    setChaptersViewMode: (mode: 'list' | 'corkboard') => void;
    triggerInsert: (content: string) => void;
    clearInsert: () => void;
    setSelection: (selection: { from: number; to: number; text: string } | null) => void;
    setActiveBeat: (beat: string | null) => void;
    triggerAudit: (pending: boolean) => void;
}

interface VaultState {
    characters: Character[];
    worldElements: WorldElement[];
    selectedCharacter: Character | null;
    selectedWorldElement: WorldElement | null;
    setCharacters: (characters: Character[]) => void;
    setWorldElements: (elements: WorldElement[]) => void;
    setSelectedCharacter: (character: Character | null) => void;
    setSelectedWorldElement: (element: WorldElement | null) => void;
    addCharacter: (character: Character) => void;
    updateCharacterInStore: (character: Character) => void;
    removeCharacter: (id: string) => void;
    addWorldElement: (element: WorldElement) => void;
    updateWorldElementInStore: (element: WorldElement) => void;
    removeWorldElement: (id: string) => void;
}

interface ProjectState {
    currentProject: Project | null;
    projects: Project[];
    chapters: Chapter[];
    setProjects: (projects: Project[]) => void;
    setCurrentProject: (project: Project | null) => void;
    setChapters: (chapters: Chapter[]) => void;
    addProject: (project: Project) => void;
    updateProjectInStore: (project: Project) => void;
    removeProject: (id: string) => void;
    addChapter: (chapter: Chapter) => void;
    updateChapterInStore: (chapter: Chapter) => void;
    removeChapter: (id: string) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
    currentProject: null,
    projects: [],
    chapters: [],

    setProjects: (projects) => set({ projects }),

    setCurrentProject: (currentProject) => set({ currentProject }),

    setChapters: (chapters) => set({ chapters }),

    addProject: (project) => set((state) => ({
        projects: [project, ...state.projects]
    })),

    updateProjectInStore: (project) => set((state) => ({
        projects: state.projects.map((p) => (p.id === project.id ? project : p)),
        currentProject: state.currentProject?.id === project.id ? project : state.currentProject,
    })),

    removeProject: (id) => set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProject: state.currentProject?.id === id ? null : state.currentProject,
    })),

    addChapter: (chapter) => set((state) => ({
        chapters: [...state.chapters, chapter].sort((a, b) => a.chapter_number - b.chapter_number),
    })),

    updateChapterInStore: (chapter) => set((state) => ({
        chapters: state.chapters.map((c) => (c.id === chapter.id ? chapter : c)),
    })),

    removeChapter: (id) => set((state) => ({
        chapters: state.chapters.filter((c) => c.id !== id),
    })),
}));

export const useEditorStore = create<EditorState>((set) => ({
    currentChapter: null,
    saveStatus: 'saved',
    isFocusMode: false,
    activeSidebarTab: 'overview',
    chaptersViewMode: 'list',
    pendingInsertion: null,
    lastSelection: null,
    activeBeat: null,
    pendingAudit: false,
    setCurrentChapter: (currentChapter) => set({ currentChapter }),
    setSaveStatus: (saveStatus) => set({ saveStatus }),
    setFocusMode: (isFocusMode) => set({ isFocusMode }),
    setActiveSidebarTab: (activeSidebarTab) => set({ activeSidebarTab }),
    setChaptersViewMode: (chaptersViewMode) => set({ chaptersViewMode }),
    triggerInsert: (content) => set({ pendingInsertion: content }),
    clearInsert: () => set({ pendingInsertion: null }),
    setSelection: (lastSelection) => set({ lastSelection }),
    setActiveBeat: (activeBeat) => set({ activeBeat }),
    triggerAudit: (pendingAudit) => set({ pendingAudit }),
}));

export const useVaultStore = create<VaultState>((set) => ({
    characters: [],
    worldElements: [],
    selectedCharacter: null,
    selectedWorldElement: null,

    setCharacters: (characters) => set({ characters }),
    setWorldElements: (worldElements) => set({ worldElements }),
    setSelectedCharacter: (selectedCharacter) => set({ selectedCharacter }),
    setSelectedWorldElement: (selectedWorldElement) => set({ selectedWorldElement }),

    addCharacter: (character) => set((state) => ({
        characters: [...state.characters, character].sort((a, b) => a.name.localeCompare(b.name)),
    })),

    updateCharacterInStore: (character) => set((state) => ({
        characters: state.characters.map((c) => (c.id === character.id ? character : c)),
        selectedCharacter: state.selectedCharacter?.id === character.id ? character : state.selectedCharacter,
    })),

    removeCharacter: (id) => set((state) => ({
        characters: state.characters.filter((c) => c.id !== id),
        selectedCharacter: state.selectedCharacter?.id === id ? null : state.selectedCharacter,
    })),

    addWorldElement: (element) => set((state) => ({
        worldElements: [...state.worldElements, element].sort((a, b) =>
            a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
        ),
    })),

    updateWorldElementInStore: (element) => set((state) => ({
        worldElements: state.worldElements.map((e) => (e.id === element.id ? element : e)),
        selectedWorldElement: state.selectedWorldElement?.id === element.id ? element : state.selectedWorldElement,
    })),

    removeWorldElement: (id) => set((state) => ({
        worldElements: state.worldElements.filter((e) => e.id !== id),
        selectedWorldElement: state.selectedWorldElement?.id === id ? null : state.selectedWorldElement,
    })),
}));
