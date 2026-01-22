import { useState, useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { Save, Loader2 } from 'lucide-react';
import { debounce } from 'lodash';

export function SynopsisPanel() {
    const { currentProject, updateProjectInStore, setCurrentProject } = useProjectStore();
    const [synopsis, setSynopsis] = useState(currentProject?.synopsis || '');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (currentProject) {
            setSynopsis(currentProject.synopsis || '');
        }
    }, [currentProject?.id, currentProject?.synopsis]);

    const debouncedSave = debounce(async (val: string) => {
        if (!currentProject) return;
        setIsSaving(true);
        try {
            const updated = await window.electronAPI.updateProject(currentProject.id, { synopsis: val });
            updateProjectInStore(updated);
            setCurrentProject(updated);
        } catch (err) {
            console.error('Failed to save synopsis:', err);
        } finally {
            setIsSaving(false);
        }
    }, 1000);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setSynopsis(val);
        debouncedSave(val);
    };

    if (!currentProject) {
        return <div className="p-8 text-muted-foreground">Select a project to edit synopsis.</div>;
    }

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

                <textarea
                    value={synopsis}
                    onChange={handleChange}
                    className="w-full h-[calc(100vh-200px)] bg-background border border-border rounded-lg p-6 text-lg leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary resize-none font-serif"
                    placeholder="Once upon a time..."
                />
            </div>
        </div>
    );
}
