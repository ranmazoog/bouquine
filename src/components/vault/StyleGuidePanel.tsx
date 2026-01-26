import { useState, useEffect, useRef } from 'react';
import { Palette, Save, Loader2, Feather } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import type { StyleGuide } from '../../types/electron';

const POV_OPTIONS = [
    { value: 'first', label: 'First Person' },
    { value: 'second', label: 'Second Person' },
    { value: 'third_limited', label: 'Third Person Limited' },
    { value: 'third_omniscient', label: 'Third Person Omniscient' },
];

const TENSE_OPTIONS = [
    { value: 'past', label: 'Past Tense' },
    { value: 'present', label: 'Present Tense' },
    { value: 'future', label: 'Future Tense' },
];

export function StyleGuidePanel() {
    const { currentProject } = useProjectStore();
    const [styleGuide, setStyleGuide] = useState<StyleGuide | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load style guide when project changes
    useEffect(() => {
        const loadStyleGuide = async () => {
            if (!currentProject) {
                setStyleGuide(null);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const guide = await window.electronAPI.getStyleGuide(currentProject.id);
                setStyleGuide(guide);
            } catch (err) {
                console.error('Failed to load style guide:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadStyleGuide();
    }, [currentProject?.id]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, []);

    const handleAnalyzeVoice = async () => {
        if (!currentProject || isAnalyzing) return;

        setIsAnalyzing(true);
        try {
            await window.electronAPI.analyzeAuthorStyle({
                projectId: currentProject.id,
                provider: 'openrouter'
            });

            // The backend already updates vocabulary_preferences and prose_samples
            // Just reload the style guide to get the updated data
            if (currentProject) {
                const refreshedGuide = await window.electronAPI.getStyleGuide(currentProject.id);
                setStyleGuide(refreshedGuide);
                setLastSaved(new Date());
            }
        } catch (err: any) {
            console.error('Failed to analyze voice:', err);
            alert(err?.message || 'Failed to analyze writing voice. Make sure Chapter 1 has content.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const saveStyleGuide = async (data: Partial<StyleGuide>) => {
        if (!currentProject) return;

        // Debounce saves
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(async () => {
            setIsSaving(true);
            try {
                const updated = await window.electronAPI.updateStyleGuide(currentProject.id, data);
                setStyleGuide(updated);
                setLastSaved(new Date());
            } catch (err) {
                console.error('Failed to save style guide:', err);
            } finally {
                setIsSaving(false);
            }
        }, 500);
    };

    const handleChange = (field: keyof StyleGuide, value: string) => {
        if (!styleGuide) return;

        // Update local state immediately
        setStyleGuide({ ...styleGuide, [field]: value });

        // Debounce save to backend
        saveStyleGuide({ [field]: value });
    };

    if (!currentProject) {
        return (
            <div className="flex-1 flex items-center justify-center bg-card">
                <div className="text-center space-y-2">
                    <Palette size={32} className="mx-auto text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">Select a project to edit its style guide.</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-card">
                <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-card">
            <div className="max-w-2xl mx-auto p-8 space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Palette size={20} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold">Style Guide</h2>
                            <p className="text-sm text-muted-foreground">Define writing rules for AI assistance</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {isSaving && (
                            <>
                                <Loader2 size={12} className="animate-spin" />
                                <span>Saving...</span>
                            </>
                        )}
                        {!isSaving && lastSaved && (
                            <>
                                <Save size={12} />
                                <span>Saved</span>
                            </>
                        )}
                    </div>
                </div>

                {/* POV and Tense Row */}
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Point of View</label>
                        <select
                            value={styleGuide?.pov || 'third_limited'}
                            onChange={(e) => handleChange('pov', e.target.value)}
                            className="w-full bg-accent/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                        >
                            {POV_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Tense</label>
                        <select
                            value={styleGuide?.tense || 'past'}
                            onChange={(e) => handleChange('tense', e.target.value)}
                            className="w-full bg-accent/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                        >
                            {TENSE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Vocabulary Preferences (Voice/Tone) */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Voice & Tone / Vocabulary Preferences</label>
                        <button
                            onClick={handleAnalyzeVoice}
                            disabled={isAnalyzing}
                            className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-all disabled:opacity-50 border border-primary/20"
                        >
                            {isAnalyzing ? (
                                <Loader2 size={12} className="animate-spin" />
                            ) : (
                                <Feather size={12} />
                            )}
                            {isAnalyzing ? 'Analyzing Chapters...' : '✨ Analyze My Voice from Chapters'}
                        </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Describe the writing style, tone, and vocabulary rules. E.g., "British English", "formal tone", "avoid contractions".
                    </p>
                    <textarea
                        value={styleGuide?.vocabulary_preferences || ''}
                        onChange={(e) => handleChange('vocabulary_preferences', e.target.value)}
                        placeholder="E.g., Use British English spelling (colour, favour). Maintain a literary, slightly formal tone. Avoid modern slang."
                        className="w-full bg-accent/30 border border-border rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none min-h-[120px]"
                    />
                </div>

                {/* Things to Avoid */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Things to Avoid</label>
                    <p className="text-xs text-muted-foreground">
                        Words, phrases, or patterns the AI should never use.
                    </p>
                    <textarea
                        value={styleGuide?.things_to_avoid || ''}
                        onChange={(e) => handleChange('things_to_avoid', e.target.value)}
                        placeholder="E.g., Avoid clichés like 'suddenly'. Never use 'said' tags with adverbs. Don't start sentences with 'It was'."
                        className="w-full bg-accent/30 border border-border rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none min-h-[100px]"
                    />
                </div>

                {/* Prose Samples */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Prose Samples</label>
                    <p className="text-xs text-muted-foreground">
                        Paste examples of your writing style for the AI to emulate.
                    </p>
                    <textarea
                        value={styleGuide?.prose_samples || ''}
                        onChange={(e) => handleChange('prose_samples', e.target.value)}
                        placeholder="Paste a paragraph or two that exemplifies your desired writing style..."
                        className="w-full bg-accent/30 border border-border rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none min-h-[150px] font-serif"
                    />
                </div>

                {/* Author Influences */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Author Influences</label>
                    <p className="text-xs text-muted-foreground">
                        Authors whose style you want to emulate or draw inspiration from.
                    </p>
                    <textarea
                        value={styleGuide?.author_influences || ''}
                        onChange={(e) => handleChange('author_influences', e.target.value)}
                        placeholder="E.g., Ursula K. Le Guin's sparse but evocative prose. Patrick Rothfuss's lyrical descriptions."
                        className="w-full bg-accent/30 border border-border rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none min-h-[80px]"
                    />
                </div>
            </div>
        </div>
    );
}
