import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { Save, Loader2, Sparkles, ChevronDown, ChevronRight, Info } from 'lucide-react';
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
                            Write your full internal plot outline here. The AI reads this to understand the story arc.
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

                <div className="flex flex-col gap-4">
                    {/* Workshop Trigger */}
                    <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <Sparkles size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold">Stuck on the plot?</h3>
                                <p className="text-xs text-muted-foreground">Try the guided workshop to weave your ideas together.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setWorkshopOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:scale-[1.02] transition-all shadow-md shadow-primary/10 group"
                        >
                            <Sparkles size={14} className="group-hover:rotate-12 transition-transform" />
                            Start Workshop
                        </button>
                    </div>

                    {/* Guidance Toggle */}
                    {isEmpty && (
                        <div className="p-4 bg-accent/30 rounded-xl border border-border/50">
                            <button
                                onClick={() => setShowGuidance(!showGuidance)}
                                className="flex items-center gap-2 text-sm font-bold text-foreground hover:opacity-80 transition-opacity"
                            >
                                {showGuidance ? (
                                    <ChevronDown size={14} className="text-muted-foreground" />
                                ) : (
                                    <ChevronRight size={14} className="text-muted-foreground" />
                                )}
                                <Info size={14} className="text-primary" />
                                <span>Writing Tips</span>
                            </button>
                            {showGuidance && (
                                <div className="mt-3 pl-6 space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        The Synopsis gives the AI "foresight" — helping with foreshadowing and avoiding plot holes.
                                    </p>
                                    <div className="text-sm text-muted-foreground">
                                        <p className="font-bold text-foreground mb-1">Answer these core questions:</p>
                                        <ul className="list-disc list-inside space-y-1 opacity-80">
                                            <li>Who is the protagonist and what is their status quo?</li>
                                            <li>What is the inciting incident?</li>
                                            <li>What is the final showdown or choice?</li>
                                            <li>How does the journey change the character?</li>
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Main Area */}
                    <textarea
                        value={synopsis}
                        onChange={handleChange}
                        className="w-full h-[calc(100vh-350px)] bg-background border border-border rounded-xl p-8 text-lg leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none font-serif shadow-inner"
                        placeholder={`What's the inciting incident that sets your story in motion?

Who is your protagonist, and what do they want?

What's standing in their way?

How does the story resolve?

(Click the ✨ Start Workshop button for guided help, or start writing here...)`}
                    />
                </div>

                <SynopsisWorkshop
                    isOpen={workshopOpen}
                    onClose={() => setWorkshopOpen(false)}
                    onComplete={handleWorkshopComplete}
                />
            </div>
        </div>
    );
}
