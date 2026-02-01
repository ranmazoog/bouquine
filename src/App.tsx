import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { AIAssistant } from './components/editor/AIAssistant';
import { NewProjectModal } from './components/projects/NewProjectModal';
import { SettingsModal } from './components/shared/SettingsModal';
import { NovelEditor } from './components/editor/NovelEditor';
import { CharacterPanel } from './components/vault/CharacterPanel';
import { WorldPanel } from './components/vault/WorldPanel';
import { StyleGuidePanel } from './components/vault/StyleGuidePanel';
import { ProjectOverview } from './components/dashboard/ProjectOverview';
import { CorkboardView } from './components/planning/CorkboardView';
import { SynopsisPanel } from './components/planning/SynopsisPanel';
import { ResearchPanel } from './components/planning/ResearchPanel';
import { OnboardingGuide } from './components/onboarding/OnboardingGuide';
import { useProjectStore, useEditorStore } from './stores/projectStore';
import { useProject } from './hooks/useProject';
import { useEffect, useState } from 'react';
import { CheckCircle2, RotateCw, AlertCircle, FileText, Feather, Plus } from 'lucide-react';

function App() {
  const { setProjects, setCurrentProject, setChapters, addProject, updateProjectInStore, currentProject } = useProjectStore();
  const {
    currentChapter, setCurrentChapter, saveStatus, isFocusMode,
    activeSidebarTab, setViewMode, setActiveSidebarTab
  } = useEditorStore();
  const { chapters, addChapter } = useProjectStore();
  const { createProject } = useProject();
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize dark mode from settings
    const initTheme = async () => {
      const darkMode = await window.electronAPI.getSetting('darkMode');
      if (darkMode === true) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    initTheme();

    // Initial data load
    const loadProjects = async () => {
      try {
        const projects = await window.electronAPI.getProjects();
        setProjects(projects);
        // Only set current project if none is selected
        if (projects.length > 0 && !currentProject) {
          setCurrentProject(projects[0]);
        }
      } catch (err) {
        console.error('Failed to load projects:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, [setProjects, setCurrentProject]); // Removed getProjects dependency as it might cause loops if not stable, though we stabilized it. And we don't want to re-run this logic just because the function reference changed anyway.

  // Load chapters when current project changes
  useEffect(() => {
    const loadChapters = async () => {
      if (currentProject) {
        try {
          const chapters = await window.electronAPI.getChapterTree(currentProject.id);
          setChapters(chapters);
        } catch (err) {
          console.error('Failed to load chapters:', err);
        }
      } else {
        setChapters([]);
      }
    };

    loadChapters();
  }, [currentProject?.id, setChapters]);

  const handleStartChapter1 = async () => {
    if (!currentProject) return;
    try {
      const newChapter = await window.electronAPI.createChapter({
        project_id: currentProject.id,
        chapter_number: 1,
        title: 'Chapter 1'
      });
      addChapter(newChapter);
      setCurrentChapter(newChapter);
      setViewMode('write');
      setActiveSidebarTab('chapters');
    } catch (err) {
      console.error('Failed to create Chapter 1:', err);
    }
  };

  const handleCreateNewChapter = async () => {
    if (!currentProject) return;
    try {
      const newChapter = await window.electronAPI.createChapter({
        project_id: currentProject.id,
        chapter_number: chapters.length + 1,
        title: `Chapter ${chapters.length + 1}`
      });
      addChapter(newChapter);
      setCurrentChapter(newChapter);
      setViewMode('write');
      setActiveSidebarTab('chapters');
    } catch (err) {
      console.error('Failed to create chapter:', err);
    }
  };

  // Track last visited chapter
  useEffect(() => {
    if (currentProject && currentChapter) {
      if (currentProject.last_visited_chapter_id !== currentChapter.id) {
        window.electronAPI.updateProject(currentProject.id, { last_visited_chapter_id: currentChapter.id })
          .then((updated) => {
            updateProjectInStore(updated);
          })
          .catch(err => console.error('Failed to update last visited chapter:', err));
      }
    }
  }, [currentChapter?.id, currentProject?.id, updateProjectInStore]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        const currentMode = useEditorStore.getState().viewMode;
        useEditorStore.getState().setViewMode(currentMode === 'write' ? 'plan' : 'write');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCreateProject = async (data: {
    title: string;
    genre?: string;
    audience?: string;
    target_word_count?: number;
  }) => {
    try {
      const newProject = await createProject(data);
      addProject(newProject);
      setCurrentProject(newProject);
      setIsNewProjectModalOpen(false);
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background text-foreground items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading Bouquine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/20">

      {!isFocusMode && (
        <Sidebar onSettingsClick={() => setIsSettingsModalOpen(true)} />
      )}

      <main className="flex-1 flex flex-col relative h-screen overflow-hidden transition-all duration-300">
        <Header onNewProject={() => setIsNewProjectModalOpen(true)} />

        <div className="flex-1 flex overflow-hidden">
          {/* Project Overview Dashboard */}
          {activeSidebarTab === 'overview' && currentProject && (
            <ProjectOverview />
          )}

          {/* Vault panels - Characters and World Bible */}
          {activeSidebarTab === 'characters' && currentProject && (
            <CharacterPanel />
          )}

          {activeSidebarTab === 'world' && currentProject && (
            <WorldPanel />
          )}

          {activeSidebarTab === 'styleguide' && currentProject && (
            <StyleGuidePanel />
          )}

          {/* Synopsis Panel */}
          {activeSidebarTab === 'synopsis' && currentProject && (
            <SynopsisPanel />
          )}

          {/* Research Panel */}
          {activeSidebarTab === 'research' && currentProject && (
            <ResearchPanel />
          )}

          {/* Main editor area - only show for chapters tab */}
          {activeSidebarTab === 'chapters' && (
            <>
              {useEditorStore.getState().viewMode === 'plan' ? (
                <CorkboardView />
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto bg-card shadow-inner relative">
                    <div className={`mx-auto py-20 px-12 min-h-full flex flex-col transition-all duration-300 ${isFocusMode ? 'max-w-4xl' : 'max-w-3xl'}`}>

                      {!currentProject ? (
                        // Welcome Screen
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-700">
                          <div className="w-20 h-20 bg-primary/5 rounded-2xl flex items-center justify-center text-primary mb-2 shadow-sm border border-border/50">
                            <span className="text-4xl text-slate-800 dark:text-slate-200">✒️</span>
                          </div>
                          <div className="space-y-2">
                            <h2 className="text-4xl font-bold gradient-text">Welcome to Bouquine</h2>
                            <p className="text-muted-foreground max-w-sm text-base leading-relaxed">
                              Your modern hub for distraction-free writing. Create a project to start your journey.
                            </p>
                          </div>
                          <button
                            onClick={() => setIsNewProjectModalOpen(true)}
                            className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:scale-105 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                          >
                            Get Started
                          </button>
                        </div>
                      ) : !currentChapter ? (
                        // Project Dashboard (No Chapter Selected)
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
                          <div className="relative">
                            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-2 ring-1 ring-primary/20">
                              <Feather size={40} className="text-primary animate-pulse" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center shadow-sm">
                              <FileText size={12} className="text-muted-foreground" />
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h2 className="text-3xl font-serif font-bold tracking-tight">{currentProject.title}</h2>
                            <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground font-medium">
                              {currentProject.genre && <span className="px-2 py-0.5 bg-accent/50 rounded-md">{currentProject.genre}</span>}
                              {currentProject.target_word_count && (
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 size={12} className="text-primary/60" />
                                  {currentProject.target_word_count.toLocaleString()} words
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="space-y-6 max-w-md">
                            <p className="text-lg text-muted-foreground leading-relaxed">
                              Ready to write your story? Your AI muse is ready. <br />
                              <span className="text-foreground/80 font-medium">Pick a chapter to start, or create a new one to begin.</span>
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                              <button
                                onClick={handleStartChapter1}
                                className="w-full sm:w-auto px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group"
                              >
                                <Feather size={18} className="group-hover:rotate-12 transition-transform" />
                                Start Chapter 1
                              </button>
                              <button
                                onClick={handleCreateNewChapter}
                                className="w-full sm:w-auto px-6 py-3 bg-accent hover:bg-accent/80 text-foreground rounded-xl font-bold transition-all flex items-center justify-center gap-2 border border-border/50"
                              >
                                <Plus size={18} />
                                Create New Chapter
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Editor - key forces remount on chapter switch for clean state
                        <NovelEditor key={currentChapter.id} />
                      )}

                    </div>
                  </div>

                  {!isFocusMode && <AIAssistant onSettingsClick={() => setIsSettingsModalOpen(true)} />}
                </>
              )}
            </>
          )}

          {/* Show welcome for vault/overview tabs when no project */}
          {(activeSidebarTab === 'overview' || activeSidebarTab === 'characters' || activeSidebarTab === 'world' || activeSidebarTab === 'styleguide') && !currentProject && (
            <div className="flex-1 flex items-center justify-center bg-card">
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">Create or select a project first.</p>
                <button
                  onClick={() => setIsNewProjectModalOpen(true)}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-medium hover:scale-105 transition-all"
                >
                  Create New Project
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <footer className="h-8 glass border-t flex items-center justify-between px-4 text-[10px] text-muted-foreground no-drag">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-2 py-0.5 rounded-full ${!currentProject ? 'opacity-50' :
              saveStatus === 'unsaved' ? 'bg-amber-500/10 text-amber-500' :
                saveStatus === 'saving' ? 'bg-blue-500/10 text-blue-500' :
                  'bg-green-500/10 text-green-500'
              }`}>
              {saveStatus === 'saved' && (
                <>
                  <CheckCircle2 size={10} />
                  <span>Saved</span>
                </>
              )}
              {saveStatus === 'saving' && (
                <>
                  <RotateCw size={10} className="animate-spin" />
                  <span>Saving...</span>
                </>
              )}
              {saveStatus === 'unsaved' && (
                <>
                  <AlertCircle size={10} />
                  <span>Unsaved changes</span>
                </>
              )}
            </div>

            {currentChapter && (
              <div className="h-3 w-[1px] bg-border" />
            )}

            {currentChapter && (
              <span>
                {currentChapter.word_count.toLocaleString()} words (Chapter)
              </span>
            )}

            {currentProject && currentProject.target_word_count && (
              <span>
                | {currentProject.target_word_count.toLocaleString()} words (Target)
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Additional stats could go here */}
          </div>
        </footer>
      </main >

      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onSubmit={handleCreateProject}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {currentProject && <OnboardingGuide />}
    </div>
  );
}

export default App;
