import { BookOpen, User, Target, Calendar, Edit3, FileText, Users, Globe, TrendingUp, Feather, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useProjectStore, useEditorStore, useVaultStore } from '../../stores/projectStore';
import { toast } from '../../lib/toast';
import { friendlyAIError } from '../../lib/aiError';

export function ProjectOverview() {
    const { currentProject, chapters, updateProjectInStore, setCurrentProject } = useProjectStore();
    const { setActiveSidebarTab, setCurrentChapter } = useEditorStore();
    const { characters, worldElements, setCharacters, setWorldElements } = useVaultStore();

    const [isEditingAuthor, setIsEditingAuthor] = useState(false);
    const [isEditingBlurb, setIsEditingBlurb] = useState(false);
    const [authorValue, setAuthorValue] = useState(currentProject?.author || '');
    const [blurbValue, setBlurbValue] = useState(currentProject?.blurb || '');
    const [isGeneratingBlurb, setIsGeneratingBlurb] = useState(false);

    // Load vault data when project changes
    useEffect(() => {
        const loadVaultData = async () => {
            if (!currentProject) return;
            try {
                const [chars, elements] = await Promise.all([
                    window.electronAPI.getCharacters(currentProject.id),
                    window.electronAPI.getWorldElements(currentProject.id),
                ]);
                setCharacters(chars);
                setWorldElements(elements);
            } catch (err) {
                console.error('Failed to load vault data:', err);
                toast.error('Unable to load project details.');
            }
        };
        loadVaultData();
    }, [currentProject?.id, setCharacters, setWorldElements]);

    // Reset local state when project changes
    useEffect(() => {
        setAuthorValue(currentProject?.author || '');
        setBlurbValue(currentProject?.blurb || '');
    }, [currentProject?.id, currentProject?.author, currentProject?.blurb]);

    if (!currentProject) {
        return (
            <div className="flex-1 flex items-center justify-center bg-card text-muted-foreground">
                <p>No project selected.</p>
            </div>
        );
    }

    const totalWords = chapters.reduce((sum, ch) => sum + (ch.word_count || 0), 0);
    const progressPercent = currentProject.target_word_count
        ? Math.min(100, Math.round((totalWords / currentProject.target_word_count) * 100))
        : 0;

    const handleSaveAuthor = async () => {
        try {
            const updated = await window.electronAPI.updateProject(currentProject.id, { author: authorValue });
            updateProjectInStore(updated);
            setCurrentProject(updated);
            setIsEditingAuthor(false);
            toast.success('Author saved.');
        } catch (err) {
            console.error('Failed to update author:', err);
            toast.error('Unable to save author. Please try again.');
        }
    };

    const handleSaveBlurb = async () => {
        try {
            const updated = await window.electronAPI.updateProject(currentProject.id, { blurb: blurbValue });
            updateProjectInStore(updated);
            setCurrentProject(updated);
            setIsEditingBlurb(false);
            toast.success('Blurb saved.');
        } catch (err) {
            console.error('Failed to update blurb:', err);
            toast.error('Unable to save blurb. Please try again.');
        }
    };

    const handleGenerateBlurb = async () => {
        if (!currentProject) return;

        if (!currentProject.synopsis || currentProject.synopsis.trim().length === 0) {
            toast.info('Please write a synopsis first to generate a blurb.');
            return;
        }

        setIsGeneratingBlurb(true);
        try {
            const generatedBlurb = await window.electronAPI.generateBlurb(currentProject.id, currentProject.synopsis);
            setBlurbValue(generatedBlurb);
            // Auto-save the generated blurb to the database
            const updated = await window.electronAPI.updateProject(currentProject.id, { blurb: generatedBlurb });
            updateProjectInStore(updated);
            setCurrentProject(updated);
            toast.success('Blurb generated and saved.');
        } catch (err) {
            console.error('Failed to generate blurb:', err);
            toast.error(friendlyAIError(err));
        } finally {
            setIsGeneratingBlurb(false);
        }
    };

    const handleNavigateToChapters = () => {
        setActiveSidebarTab('chapters');
        if (chapters.length > 0) {
            // Determine target chapter
            let targetChapter = null;
            if (currentProject.last_visited_chapter_id) {
                targetChapter = chapters.find(c => c.id === currentProject.last_visited_chapter_id);
            }
            if (!targetChapter) {
                targetChapter = chapters[0];
            }
            setCurrentChapter(targetChapter);
        }
    };

    const handleNavigateToCharacters = () => {
        setActiveSidebarTab('characters');
    };

    const handleNavigateToWorld = () => {
        setActiveSidebarTab('world');
    };

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto py-12 px-8 animate-in fade-in duration-700">
                {/* Hero Section */}
                <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-primary/5 rounded-2xl flex items-center justify-center text-primary mx-auto mb-6 shadow-sm border border-border/50">
                        <BookOpen size={36} />
                    </div>
                    <h1 className="text-4xl font-bold mb-2 gradient-text">{currentProject.title}</h1>

                    {/* Author (Editable) */}
                    <div className="flex items-center justify-center gap-2 mb-4">
                        {isEditingAuthor ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={authorValue}
                                    onChange={(e) => setAuthorValue(e.target.value)}
                                    className="bg-accent border border-border rounded px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="Author name"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveAuthor();
                                        if (e.key === 'Escape') {
                                            setAuthorValue(currentProject.author || '');
                                            setIsEditingAuthor(false);
                                        }
                                    }}
                                />
                                <button
                                    onClick={handleSaveAuthor}
                                    className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={() => {
                                        setAuthorValue(currentProject.author || '');
                                        setIsEditingAuthor(false);
                                    }}
                                    className="px-3 py-1 bg-accent text-foreground rounded text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsEditingAuthor(true)}
                                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all group border border-transparent hover:border-border/50 rounded px-3 py-1"
                            >
                                <User size={16} />
                                <span>{currentProject.author || 'Add author name'}</span>
                                <Edit3 size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                            </button>
                        )}
                    </div>

                    {/* Genre Badge */}
                    {currentProject.genre && (
                        <span className="inline-block px-3 py-1 bg-accent text-muted-foreground rounded-full text-sm">
                            {currentProject.genre}
                        </span>
                    )}
                </div>

                {/* Blurb Section */}
                <div className="mb-10 p-6 bg-accent/30 rounded-xl border border-border/50 relative">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Book Blurb / Premise</h2>
                        <div className="flex items-center gap-2">
                            {isGeneratingBlurb ? (
                                <div className="flex items-center gap-2 text-primary">
                                    <Loader2 size={14} className="animate-spin" />
                                    <span className="text-xs">Generating...</span>
                                </div>
                            ) : (
                                <button
                                    onClick={handleGenerateBlurb}
                                    className="text-muted-foreground hover:text-primary transition-colors"
                                    title="Draft Blurb from Synopsis"
                                >
                                    <Feather
                                        size={14}
                                        className="text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)] hover:text-blue-500 transition-all"
                                    />
                                </button>
                            )}
                            {!isEditingBlurb && (
                                <button
                                    onClick={() => setIsEditingBlurb(true)}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Edit3 size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                    {isEditingBlurb ? (
                        <div className="space-y-3">
                            <textarea
                                value={blurbValue}
                                onChange={(e) => setBlurbValue(e.target.value)}
                                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                                rows={4}
                                placeholder="Write a short blurb or premise for your book..."
                                autoFocus
                            />
                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => {
                                        setBlurbValue(currentProject.blurb || '');
                                        setIsEditingBlurb(false);
                                    }}
                                    className="px-4 py-1.5 bg-accent text-foreground rounded-lg text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveBlurb}
                                    className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm"
                                >
                                    Save Blurb
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-foreground leading-relaxed whitespace-pre-wrap">
                            {currentProject.blurb || (
                                <span className="text-muted-foreground italic">
                                    No blurb yet. Click the edit icon to add one.
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    <StatCard
                        icon={<FileText size={20} />}
                        label="Chapters"
                        value={chapters.length}
                        onClick={handleNavigateToChapters}
                    />
                    <StatCard
                        icon={<TrendingUp size={20} />}
                        label="Total Words"
                        value={totalWords.toLocaleString()}
                    />
                    <StatCard
                        icon={<Users size={20} />}
                        label="Characters"
                        value={characters.length}
                        onClick={handleNavigateToCharacters}
                    />
                    <StatCard
                        icon={<Globe size={20} />}
                        label="World Elements"
                        value={worldElements.length}
                        onClick={handleNavigateToWorld}
                    />
                </div>

                {/* Progress Bar */}
                {currentProject.target_word_count && currentProject.target_word_count > 0 && (
                    <div className="mb-10 p-6 bg-accent/30 rounded-xl border border-border/50">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Target size={16} className="text-primary" />
                                <span className="text-sm font-semibold">Progress to Goal</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                                {totalWords.toLocaleString()} / {currentProject.target_word_count.toLocaleString()} words
                            </span>
                        </div>
                        <div className="h-3 bg-background rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 text-right">{progressPercent}% complete</p>
                    </div>
                )}

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-3 justify-center">
                    <button
                        onClick={handleNavigateToChapters}
                        className="px-5 py-2.5 bg-primary text-primary-foreground rounded-full font-medium hover:scale-105 transition-all shadow-lg shadow-primary/20"
                    >
                        {totalWords > 0 ? 'Continue Writing' : 'Start Writing'}
                    </button>
                    <button
                        onClick={handleNavigateToCharacters}
                        className="px-5 py-2.5 bg-accent text-foreground rounded-full font-medium hover:bg-accent/80 transition-all"
                    >
                        Manage Characters
                    </button>
                    <button
                        onClick={handleNavigateToWorld}
                        className="px-5 py-2.5 bg-accent text-foreground rounded-full font-medium hover:bg-accent/80 transition-all"
                    >
                        Build Your World
                    </button>
                </div>

                {/* Project Meta */}
                <div className="mt-12 pt-6 border-t border-border/50 flex items-center justify-center gap-6 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>Created: {new Date(currentProject.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>Updated: {new Date(currentProject.updated_at).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({
    icon,
    label,
    value,
    onClick
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    onClick?: () => void;
}) {
    const Component = onClick ? 'button' : 'div';
    return (
        <Component
            onClick={onClick}
            className={`p-6 bg-card border border-border rounded-xl text-center transition-all ${onClick ? 'hover:scale-[1.02] cursor-pointer' : 'cursor-default'
                }`}
        >
            <div className="flex justify-center mb-3 text-primary">{icon}</div>
            <p className="text-2xl font-bold mb-1">{value}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">{label}</p>
        </Component>
    );
}
