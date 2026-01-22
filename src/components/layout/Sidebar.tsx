import { Book, Users, Globe, Palette, Settings, ChevronRight, Plus, Trash2, LayoutDashboard, FileText, Link, Moon, Sun } from 'lucide-react';
import { useProjectStore, useEditorStore } from '../../stores/projectStore';
import type { SidebarTab } from '../../stores/projectStore';
import { useEffect, useState } from 'react';

interface SidebarProps {
    onSettingsClick: () => void;
}

export function Sidebar({ onSettingsClick }: SidebarProps) {
    const { chapters, currentProject, addChapter, removeChapter } = useProjectStore();
    const { currentChapter, setCurrentChapter, activeSidebarTab, setActiveSidebarTab } = useEditorStore();
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        setIsDarkMode(document.documentElement.classList.contains('dark'));
    }, []);

    const handleDeleteChapter = async (chapterId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        const chapterToDelete = chapters.find(c => c.id === chapterId);
        if (!chapterToDelete) return;

        const confirmed = window.confirm(`Delete "${chapterToDelete.title || 'Untitled Chapter'}"? This cannot be undone.`);
        if (!confirmed) return;

        try {
            await window.electronAPI.deleteChapter(chapterId);
            removeChapter(chapterId);

            if (currentChapter?.id === chapterId) {
                const remainingChapters = chapters.filter(c => c.id !== chapterId);
                if (remainingChapters.length > 0) {
                    const deletedIndex = chapters.findIndex(c => c.id === chapterId);
                    const newIndex = Math.min(deletedIndex, remainingChapters.length - 1);
                    setCurrentChapter(remainingChapters[newIndex]);
                } else {
                    setCurrentChapter(null);
                }
            }
        } catch (err) {
            console.error('Failed to delete chapter:', err);
        }
    };

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

    const handleTabClick = (tab: SidebarTab) => {
        setActiveSidebarTab(tab);
        // Clear chapter selection when switching away from chapters tab
        if (tab !== 'chapters') {
            setCurrentChapter(null);
        }
    };

    return (
        <aside className="w-64 glass flex flex-col h-screen overflow-hidden border-r">
            <div className="p-4 drag-region h-16 flex items-center">
                <button
                    onClick={() => handleTabClick('overview')}
                    className="text-xl font-bold gradient-text no-drag hover:opacity-80 transition-opacity"
                    title="Project Overview"
                >
                    Bouquine
                </button>
            </div>

            <div className="flex-1 overflow-y-auto no-drag p-2 space-y-4">
                <nav className="space-y-1">
                    <NavItem
                        icon={<LayoutDashboard size={18} />}
                        label="Overview"
                        active={activeSidebarTab === 'overview'}
                        onClick={() => handleTabClick('overview')}
                    />
                    <NavItem
                        icon={<Book size={18} />}
                        label="Chapters"
                        active={activeSidebarTab === 'chapters'}
                        onClick={() => handleTabClick('chapters')}
                    />
                    <NavItem
                        icon={<FileText size={18} />}
                        label="Synopsis"
                        active={activeSidebarTab === 'synopsis'}
                        onClick={() => handleTabClick('synopsis')}
                    />
                    <NavItem
                        icon={<Users size={18} />}
                        label="Characters"
                        active={activeSidebarTab === 'characters'}
                        onClick={() => handleTabClick('characters')}
                    />
                    <NavItem
                        icon={<Globe size={18} />}
                        label="World Bible"
                        active={activeSidebarTab === 'world'}
                        onClick={() => handleTabClick('world')}
                    />
                    <NavItem
                        icon={<Palette size={18} />}
                        label="Style Guide"
                        active={activeSidebarTab === 'styleguide'}
                        onClick={() => handleTabClick('styleguide')}
                    />
                    <NavItem
                        icon={<Link size={18} />}
                        label="Research"
                        active={activeSidebarTab === 'research'}
                        onClick={() => handleTabClick('research')}
                    />
                </nav>

                {/* Chapter list - only show when chapters tab is active */}
                {activeSidebarTab === 'chapters' && (
                    <div className="pt-4 border-t border-border/50">
                        <div className="flex items-center justify-between px-2 mb-2">
                            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Chapters
                            </h2>
                            <div className="flex items-center gap-1">
                                <div className="flex bg-accent/50 rounded-lg p-0.5 mr-1">
                                    <button
                                        onClick={() => useEditorStore.getState().setChaptersViewMode('list')}
                                        className={`p-1 rounded-md transition-all ${useEditorStore.getState().chaptersViewMode === 'list' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                        title="List View"
                                    >
                                        <Book size={12} />
                                    </button>
                                    <button
                                        onClick={() => useEditorStore.getState().setChaptersViewMode('corkboard')}
                                        className={`p-1 rounded-md transition-all ${useEditorStore.getState().chaptersViewMode === 'corkboard' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                        title="Corkboard View"
                                    >
                                        <LayoutDashboard size={12} />
                                    </button>
                                </div>
                                <button
                                    onClick={handleCreateChapter}
                                    disabled={!currentProject}
                                    className="p-1 hover:bg-accent rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            {chapters.length > 0 ? (
                                chapters.map((chapter) => (
                                    <div
                                        key={chapter.id}
                                        className={`w-full text-left px-2 py-1.5 text-sm rounded-md flex items-center gap-2 group transition-colors cursor-pointer ${currentChapter?.id === chapter.id
                                            ? 'bg-primary/10 text-primary font-medium'
                                            : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                                            }`}
                                        onClick={() => setCurrentChapter(chapter)}
                                    >
                                        <ChevronRight size={14} className={`flex-shrink-0 group-hover:text-foreground ${currentChapter?.id === chapter.id ? 'text-primary' : 'text-muted-foreground'
                                            }`} />
                                        <span title={chapter.title || 'Untitled Chapter'} className="truncate flex-1">{chapter.title || 'Untitled Chapter'}</span>
                                        <button
                                            onClick={(e) => handleDeleteChapter(chapter.id, e)}
                                            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all flex-shrink-0"
                                            title="Delete chapter"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-muted-foreground px-4 py-2 italic text-center">
                                    No chapters added yet.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 border-t no-drag space-y-2">
                <button
                    onClick={async () => {
                        const newValue = !isDarkMode;
                        setIsDarkMode(newValue);
                        document.documentElement.classList.toggle('dark', newValue);
                        await window.electronAPI.setSetting('darkMode', newValue);
                    }}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                >
                    {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                    <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
                <button
                    onClick={onSettingsClick}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                >
                    <Settings size={18} />
                    <span>Settings</span>
                </button>
            </div>
        </aside>
    );
}

function NavItem({
    icon,
    label,
    active = false,
    onClick
}: {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    onClick?: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}
            `}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}
