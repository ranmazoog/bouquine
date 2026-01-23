import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Loader2, FileText, Trash2, Plus } from 'lucide-react';
import { useProjectStore, useEditorStore } from '../../stores/projectStore';
import type { Chapter } from '../../types/electron';
import { debounce } from 'lodash';

export function CorkboardView() {
    const { chapters, currentProject, updateChapterInStore, removeChapter, addChapter } = useProjectStore();
    const { setCurrentChapter, setActiveSidebarTab, setActiveBeat, setChaptersViewMode } = useEditorStore();

    const handleCreateChapter = async () => {
        if (!currentProject) return;
        try {
            const newChapter = await window.electronAPI.createChapter({
                project_id: currentProject.id,
                chapter_number: chapters.length + 1,
                title: `Chapter ${chapters.length + 1}`
            });
            addChapter(newChapter);
        } catch (err) {
            console.error('Failed to create chapter:', err);
        }
    };

    if (chapters.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center text-muted-foreground">
                    <FileText size={32} />
                </div>
                <h2 className="text-xl font-semibold">Empty Corkboard</h2>
                <p className="text-muted-foreground max-w-sm">
                    You haven't added any chapters yet. Start by creating your first scene.
                </p>
                <button
                    onClick={handleCreateChapter}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-full hover:scale-105 transition-all shadow-lg shadow-primary/20 font-medium flex items-center gap-2"
                >
                    <Plus size={18} />
                    <span>Add First Chapter</span>
                </button>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-accent/5 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {chapters.map((chapter) => (
                        <ChapterCard
                            key={chapter.id}
                            chapter={chapter}
                            onUpdate={(updated) => updateChapterInStore(updated)}
                            onDelete={(id) => removeChapter(id)}
                            setCurrentChapter={setCurrentChapter}
                            setActiveSidebarTab={setActiveSidebarTab}
                            setActiveBeat={setActiveBeat}
                            setChaptersViewMode={setChaptersViewMode}
                        />
                    ))}

                    {/* Add Chapter Card Placeholder */}
                    <button
                        onClick={handleCreateChapter}
                        className="h-[300px] border-2 border-dashed border-border/50 rounded-xl flex flex-col items-center justify-center gap-3 text-muted-foreground hover:border-primary/50 hover:text-primary transition-all group"
                    >
                        <div className="p-3 bg-accent rounded-full group-hover:bg-primary/10 transition-colors">
                            <Plus size={24} />
                        </div>
                        <span className="font-medium">Add Chapter</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

interface ChapterCardProps {
    chapter: Chapter;
    onUpdate: (chapter: Chapter) => void;
    onDelete: (id: string) => void;
    setCurrentChapter: (chapter: Chapter) => void;
    setActiveSidebarTab: (tab: any) => void;
    setActiveBeat: (beat: string | null) => void;
    setChaptersViewMode: (mode: 'list' | 'corkboard') => void;
}

function ChapterCard({ chapter, onUpdate, onDelete, setCurrentChapter, setActiveSidebarTab, setActiveBeat, setChaptersViewMode }: ChapterCardProps) {
    const [title, setTitle] = useState(chapter.title || '');
    const [summary, setSummary] = useState(chapter.summary || '');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Auto-save logic
    const debouncedSave = useCallback(
        debounce(async (id: string, updates: Partial<Chapter>) => {
            setIsSaving(true);
            try {
                const updated = await window.electronAPI.updateChapter(id, updates);
                onUpdate(updated);
            } catch (err) {
                console.error('Failed to auto-save card:', err);
            } finally {
                setIsSaving(false);
            }
        }, 1000),
        [onUpdate]
    );

    useEffect(() => {
        if (title !== (chapter.title || '') || summary !== (chapter.summary || '')) {
            debouncedSave(chapter.id, { title, summary });
        }
    }, [title, summary]);

    useEffect(() => {
        setTitle(chapter.title || '');
        setSummary(chapter.summary || '');
    }, [chapter.id, chapter.title, chapter.summary]);

    const handleGenerateBeat = async () => {
        const { currentProject, chapters } = useProjectStore.getState();
        if (!currentProject) return;

        setIsGenerating(true);
        setErrorMessage(null);

        try {
            let result: string;

            if (chapter.content && chapter.content.trim().length > 50) {
                // If content exists, summarize it
                const updatedChapter = await window.electronAPI.summarizeChapter(chapter.id, 'openrouter');
                setSummary(updatedChapter.summary || '');
                onUpdate(updatedChapter);
            } else {
                // Predictive generation
                const provider = 'openrouter'; // Default
                const currentIndex = chapters.findIndex(c => c.id === chapter.id);
                const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;

                const messages = [
                    {
                        role: 'system' as const,
                        content: `You are an expert novel outliner. Your goal is to suggest a 3-sentence plot beat for a chapter based on the project synopsis and the previous chapter's summary. Keep it punchy and forward-moving.`
                    },
                    {
                        role: 'user' as const,
                        content: `Project Title: ${currentProject.title}
  Project Synopsis: ${currentProject.blurb || 'Not provided'}
  Previous Chapter Summary: ${prevChapter?.summary || 'This is the first chapter.'}

Please suggest 3-4 sentences for the next chapter beat (Chapter ${chapter.chapter_number}).`
                    }
                ];

                result = await window.electronAPI.aiGenerate(provider, messages, { temperature: 0.7 });
                setSummary(result);
                // The useEffect will trigger the debounced save
            }
        } catch (err: any) {
            console.error('Failed to generate beat:', err);
            const errorMsg = err?.message || err?.toString() || 'Unknown error';

            if (errorMsg.includes('429') || errorMsg.includes('rate limit') || errorMsg.includes('free-models-per-day')) {
                setErrorMessage('Rate Limit: Free daily limit reached. Add credits to OpenRouter or wait until tomorrow.');
            } else if (errorMsg.includes('401') || errorMsg.includes('API key')) {
                setErrorMessage('API Key Error: Check Settings (⚙️) to configure your API key.');
            } else if (errorMsg.includes('insufficient_quota')) {
                setErrorMessage('Quota Exceeded: Your API quota has been reached.');
            } else {
                setErrorMessage(`Error: ${errorMsg}`);
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Delete Chapter ${chapter.chapter_number}?`)) {
            await window.electronAPI.deleteChapter(chapter.id);
            onDelete(chapter.id);
        }
    };

    return (
        <div className="h-[300px] flex flex-col bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow group overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between gap-3 bg-accent/20">
                <div className="flex items-center gap-2 flex-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">CH {chapter.chapter_number}</span>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="bg-transparent font-semibold text-sm border-none focus:outline-none focus:ring-1 focus:ring-primary/30 rounded px-1 flex-1 truncate"
                        placeholder="Chapter Title"
                    />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={handleDelete}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        title="Delete Card"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 p-4 relative">
                <textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="w-full h-full bg-transparent text-sm resize-none focus:outline-none leading-relaxed placeholder:italic placeholder:opacity-50"
                    placeholder="Write a brief summary or plot beat here..."
                />

                {isGenerating && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center">
                        <div className="bg-card border rounded-full px-4 py-2 flex items-center gap-2 shadow-sm">
                            <Sparkles size={14} className="text-primary animate-pulse" />
                            <span className="text-xs font-medium">Generating...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t bg-accent/5 flex flex-col gap-2">
                {errorMessage && (
                    <div className="text-[10px] text-destructive bg-destructive/10 px-2 py-1 rounded border border-destructive/20">
                        {errorMessage}
                    </div>
                )}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="px-2 py-0.5 rounded-full bg-accent text-[10px] text-muted-foreground font-medium">
                            {chapter.word_count.toLocaleString()} words
                        </div>
                        {isSaving && <Loader2 size={10} className="animate-spin text-muted-foreground" />}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleGenerateBeat}
                            disabled={isGenerating}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            <span>✨ Generate Beat</span>
                        </button>

                        <button
                            onClick={async () => {
                                if ((!chapter.content || chapter.content.trim() === '') && chapter.summary) {
                                    try {
                                        await window.electronAPI.updateChapter(chapter.id, { content: chapter.summary });
                                    } catch (err) {
                                        console.error('Failed to insert summary:', err);
                                    }
                                }
                                setCurrentChapter(chapter);
                                setChaptersViewMode('list');
                                setActiveSidebarTab('chapters');
                                if (chapter.summary) {
                                    setActiveBeat(chapter.summary);
                                }
                            }}
                            className="p-1 px-3 text-[11px] font-bold bg-accent text-muted-foreground hover:text-foreground rounded-full transition-colors"
                        >
                            Write Prose
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
