import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { Save, Loader2, Sparkles, ChevronDown, ChevronRight } from 'lucide-react';
import { debounce } from 'lodash';
import { SynopsisWorkshop } from '../synopsis/SynopsisWorkshop';

export function SynopsisPanel() {
    const { currentProject, updateProjectInStore, setCurrentProject } = useProjectStore();
    const [synopsis, setSynopsis] = useState(currentProject?.synopsis || '');
    const [isSaving, setIsSaving] = useState(false);
    const [showGuidance, setShowGuidance] = useState(true);
    const [workshopOpen, setWorkshopOpen] = useState(false);

    // Keep refs to latest values for the debounced function
    const currentProjectRef = useRef(currentProject);
    currentProjectRef.current = currentProject;

    useEffect(() => {
        if (currentProject) {
            setSynopsis(currentProject.synopsis || '');
        }
    }, [currentProject?.id, currentProject?.synopsis]);

    useEffect(() => {
        if (currentProject?.synopsis) {
            setShowGuidance(false);
        } else {
            setShowGuidance(true);
        }
    }, [currentProject?.id]);

    // Memoize the debounced save function so it persists across renders
    const debouncedSave = useMemo(
        () =>
            debounce(async (val: string) => {
                const project = currentProjectRef.current;
                if (!project) return;
                setIsSaving(true);
                try {
                    const updated = await window.electronAPI.updateProject(project.id, { synopsis: val });
                    updateProjectInStore(updated);
                    setCurrentProject(updated);
                } catch (err) {
                    console.error('Failed to save synopsis:', err);
                } finally {
                    setIsSaving(false);
                }
            }, 1000),
        [updateProjectInStore, setCurrentProject]
    );

    // Flush pending saves when unmounting
    useEffect(() => {
        return () => {
            debouncedSave.flush();
        };
    }, [debouncedSave]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setSynopsis(val);
        debouncedSave(val);
    };

    const handleWorkshopComplete = useCallback(async (generatedSynopsis: string) => {
        setSynopsis(generatedSynopsis);
        debouncedSave.cancel();
        const project = currentProjectRef.current;
        if (project) {
            try {
                const updated = await window.electronAPI.updateProject(project.id, { synopsis: generatedSynopsis });
                updateProjectInStore(updated);
                setCurrentProject(updated);
            } catch (err) {
                console.error('Failed to save synopsis:', err);
            }
        }
    }, [debouncedSave, updateProjectInStore, setCurrentProject]);

    if (!currentProject) {
        return <div className="p-8 text-muted-foreground">Select a project to edit synopsis.</div>;
    }

    const isEmpty = !synopsis || synopsis.trim().length === 0;

    return (
        <div className="flex-1 overflow-y-auto bg-card p-8">
            <div className="max-w-3xl mx-auto">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold mb-2">Story Synopsis</h1>
                        <p className="text-muted-foreground text-sm">
                            Write your full internal plot outline here. The AI reads this to understand the story arc and ending.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {isSaving ? (
                            <>
                                <Loader2 size={12} className="animate-spin" />
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <Save size={12} />
                                <span>Auto-saved</span>
                            </>
                        )}
                    </div>
                </div>

                {isEmpty && (
                    <div className="mb-4 p-4 bg-accent/30 rounded-lg border border-border/50">
                        <button
                            onClick={() => setShowGuidance(!showGuidance)}
                            className="flex items-center gap-2 text-sm font-medium text-foreground hover:opacity-80 transition-opacity"
                        >
                            {showGuidance ? (
                                <ChevronDown size={14} className="text-muted-foreground" />
                            ) : (
                                <ChevronRight size={14} className="text-muted-foreground" />
                            )}
                            <span>Writing your synopsis</span>
                        </button>
                        {showGuidance && (
                            <div className="mt-3 pl-6">
                                <p className="text-sm text-muted-foreground mb-3">
                                    The Synopsis gives the AI "foresight" — helping with foreshadowing and avoiding plot holes.
                                </p>
                                <div className="text-sm text-muted-foreground mb-3">
                                    <p className="font-medium text-foreground mb-1">Try answering:</p>
                                    <ul className="list-disc list-inside space-y-1">
                                        <li>What&apos;s the ending? Who wins, who loses?</li>
                                        <li>What&apos;s the central conflict?</li>
                                        <li>What does the protagonist want vs. need?</li>
                                    </ul>
                                </div>
                                <button
                                    onClick={() => setWorkshopOpen(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                                >
                                    <Sparkles size={14} />
                                    Help Me Brainstorm
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <textarea
                    value={synopsis}
                    onChange={handleChange}
                    className="w-full h-[calc(100vh-250px)] bg-background border border-border rounded-lg p-6 text-lg leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary resize-none font-serif"
                    placeholder="Once upon a time..."
                />

                <SynopsisWorkshop
                    isOpen={workshopOpen}
                    onClose={() => setWorkshopOpen(false)}
                    onComplete={handleWorkshopComplete}
                />
            </div>
        </div>
    );
}
