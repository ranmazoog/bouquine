import { useState, useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { Plus, Trash2, ExternalLink, FileText, Link as LinkIcon, Loader2, Tag, Layers, Search, X, Check, Save, Edit3, Feather } from 'lucide-react';
import type { Reference, Character, WorldElement, Chapter } from '../../types/electron';

export function ResearchPanel() {
    const { currentProject } = useProjectStore();
    const [references, setReferences] = useState<Reference[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Form state
    const [isAddingLink, setIsAddingLink] = useState(false);
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [linkTitle, setLinkTitle] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [noteTitle, setNoteTitle] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [noteTag, setNoteTag] = useState('');
    const [selectedElements, setSelectedElements] = useState<Array<{ id: string; type: string; title: string }>>([]);
    const [isBrainstorming, setIsBrainstorming] = useState(false);
    const [brainstormSuggestions, setBrainstormSuggestions] = useState<string | null>(null);

    // Vault data for linking
    const [characters, setCharacters] = useState<Character[]>([]);
    const [worldElements, setWorldElements] = useState<WorldElement[]>([]);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [showLinkMenu, setShowLinkMenu] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [listSearchQuery, setListSearchQuery] = useState('');
    const [editingNote, setEditingNote] = useState<{ id: string; title: string; content: string; tag: string } | null>(null);
    const [editContent, setEditContent] = useState('');

    useEffect(() => {
        if (currentProject) {
            loadReferences();
            loadVaultData();
        }
    }, [currentProject?.id]);

    const loadVaultData = async () => {
        if (!currentProject) return;
        try {
            const [chars, world, chaps] = await Promise.all([
                window.electronAPI.getCharacters(currentProject.id),
                window.electronAPI.getWorldElements(currentProject.id),
                window.electronAPI.getChapterTree(currentProject.id)
            ]);
            setCharacters(chars);
            setWorldElements(world);
            setChapters(chaps);
        } catch (err) {
            console.error('Failed to load vault data:', err);
        }
    };

    const loadReferences = async () => {
        if (!currentProject) return;
        setIsLoading(true);
        try {
            const data = await window.electronAPI.getReferences(currentProject.id);
            setReferences(data);
        } catch (err) {
            console.error('Failed to load references:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddLink = async () => {
        if (!currentProject || !linkTitle || !linkUrl) return;
        try {
            await window.electronAPI.createReference({
                project_id: currentProject.id,
                title: linkTitle,
                url: linkUrl,
                type: 'link',
                tag: noteTag || undefined,
                related_elements: selectedElements.length > 0 ? JSON.stringify(selectedElements) : undefined
            });
            resetForm();
            loadReferences();
        } catch (err) {
            console.error('Failed to add link:', err);
        }
    };

    const handleAddNote = async () => {
        if (!currentProject || !noteTitle || !noteContent) return;
        try {
            await window.electronAPI.createReference({
                project_id: currentProject.id,
                title: noteTitle,
                content: noteContent,
                type: 'note',
                tag: noteTag || undefined,
                related_elements: selectedElements.length > 0 ? JSON.stringify(selectedElements) : undefined
            });
            resetForm();
            loadReferences();
        } catch (err) {
            console.error('Failed to add note:', err);
        }
    };

    const resetForm = () => {
        setLinkTitle('');
        setLinkUrl('');
        setNoteTitle('');
        setNoteContent('');
        setNoteTag('');
        setSelectedElements([]);
        setIsAddingLink(false);
        setIsAddingNote(false);
        setSearchQuery('');
    };

    const handleSuggestGaps = async () => {
        if (!currentProject) return;
        setIsBrainstorming(true);
        setBrainstormSuggestions(null);
        try {
            const suggestions = await window.electronAPI.suggestResearchGaps(currentProject.id);
            setBrainstormSuggestions(suggestions);
        } catch (err) {
            console.error('Failed to suggest gaps:', err);
        } finally {
            setIsBrainstorming(false);
        }
    };

    const handleSaveSuggestionsAsNote = async () => {
        if (!currentProject || !brainstormSuggestions) return;
        try {
            await window.electronAPI.createReference({
                project_id: currentProject.id,
                title: 'Research Gap Suggestions',
                content: brainstormSuggestions,
                type: 'note',
                tag: 'AI Suggestions'
            });
            resetForm();
            loadReferences();
            setBrainstormSuggestions(null);
        } catch (err) {
            console.error('Failed to save suggestions as note:', err);
        }
    };

    const toggleElementLink = (id: string, type: string, title: string) => {
        setSelectedElements(prev => {
            const exists = prev.find(e => e.id === id);
            if (exists) return prev.filter(e => e.id !== id);
            return [...prev, { id, type, title }];
        });
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this reference?')) return;
        try {
            await window.electronAPI.deleteReference(id);
            loadReferences();
        } catch (err) {
            console.error('Failed to delete reference:', err);
        }
    };

    const startEditingNote = (ref: Reference) => {
        setEditingNote({ id: ref.id, title: ref.title, content: ref.content || '', tag: ref.tag || '' });
        setEditContent(ref.content || '');
    };

    const cancelEditingNote = () => {
        setEditingNote(null);
        setEditContent('');
    };

    const saveEditedNote = async () => {
        if (!editingNote || !currentProject) return;
        try {
            await window.electronAPI.updateReference(editingNote.id, {
                title: editingNote.title,
                content: editContent,
                tag: editingNote.tag || undefined
            });
            setEditingNote(null);
            setEditContent('');
            loadReferences();
        } catch (err) {
            console.error('Failed to update note:', err);
        }
    };

    const openLink = (url: string) => {
        window.electronAPI.openLink(url);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const highlightMatch = (text: string, query: string) => {
        if (!query) return text;
        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return (
            <>
                {parts.map((part, i) =>
                    part.toLowerCase() === query.toLowerCase()
                        ? <mark key={i} className="bg-primary/30 text-primary-foreground rounded-sm px-0.5">{part}</mark>
                        : part
                )}
            </>
        );
    };

    const filteredReferences = references.filter(ref =>
        ref.title.toLowerCase().includes(listSearchQuery.toLowerCase()) ||
        (ref.content || '').toLowerCase().includes(listSearchQuery.toLowerCase()) ||
        (ref.tag || '').toLowerCase().includes(listSearchQuery.toLowerCase())
    );

    if (!currentProject) {
        return <div className="p-8 text-muted-foreground">Select a project to view research.</div>;
    }

    return (
        <div className="flex-1 overflow-y-auto bg-card p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold mb-2">Research & References</h1>
                    <p className="text-muted-foreground text-sm">
                        Collect links and notes for your world building.
                    </p>
                </div>

                {/* Search Bar */}
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                        type="text"
                        value={listSearchQuery}
                        onChange={(e) => setListSearchQuery(e.target.value)}
                        placeholder="Search notes, links, tags..."
                        className="w-full bg-accent/20 border border-border/50 rounded-xl py-3 pl-10 pr-10 focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                    />
                    {listSearchQuery && (
                        <button
                            onClick={() => setListSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded-full text-muted-foreground transition-colors"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Main Content Area */}
                    <div className="md:col-span-2 space-y-6">
                        {isLoading ? (
                            <div className="flex items-center justify-center p-8">
                                <Loader2 className="animate-spin text-muted-foreground" />
                            </div>
                        ) : filteredReferences.length === 0 ? (
                            <div className="text-center p-12 border-2 border-dashed border-border/50 rounded-xl text-muted-foreground bg-accent/5">
                                {listSearchQuery ? (
                                    <div className="space-y-2">
                                        <p>No matches found for "{listSearchQuery}"</p>
                                        <button
                                            onClick={() => setListSearchQuery('')}
                                            className="text-primary hover:underline text-sm font-medium"
                                        >
                                            Clear search
                                        </button>
                                    </div>
                                ) : (
                                    "No references added yet."
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {filteredReferences.map(ref => {
                                    const related = ref.related_elements ? JSON.parse(ref.related_elements) : [];
                                    return (
                                        <div key={ref.id} className="bg-accent/30 border border-border/50 rounded-lg p-4 group hover:border-primary/30 transition-colors">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex flex-col gap-1">
                                                    <h3 className="font-semibold flex items-center gap-2">
                                                        {ref.type === 'link' ? <LinkIcon size={14} className="text-blue-400" /> : <FileText size={14} className="text-yellow-400" />}
                                                        {highlightMatch(ref.title, listSearchQuery)}
                                                    </h3>
                                                    {ref.tag && (
                                                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded flex items-center gap-1 w-fit">
                                                            <Tag size={8} />
                                                            {highlightMatch(ref.tag, listSearchQuery)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {ref.type !== 'link' && (
                                                        <button
                                                            onClick={() => startEditingNote(ref)}
                                                            className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title="Edit note"
                                                        >
                                                            <Edit3 size={14} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(ref.id)}
                                                        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            {ref.type === 'link' ? (
                                                <button
                                                    onClick={() => openLink(ref.url!)}
                                                    className="text-sm text-primary hover:underline flex items-center gap-1 mt-2"
                                                >
                                                    <ExternalLink size={12} />
                                                    {ref.url}
                                                </button>
                                            ) : editingNote?.id === ref.id ? (
                                                <div className="mt-2 space-y-3">
                                                    <textarea
                                                        value={editContent}
                                                        onChange={(e) => setEditContent(e.target.value)}
                                                        className="w-full bg-background border border-border rounded px-3 py-2 text-sm h-32 resize-none focus:ring-1 focus:ring-primary/50"
                                                        placeholder="Note content..."
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={saveEditedNote}
                                                            className="flex-1 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90"
                                                        >
                                                            Save Changes
                                                        </button>
                                                        <button
                                                            onClick={cancelEditingNote}
                                                            className="px-3 py-1.5 bg-accent text-foreground rounded text-xs hover:bg-accent/80"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-2">
                                                        {highlightMatch(ref.content || '', listSearchQuery)}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground/50 mt-2">
                                                        {ref.updated_at !== ref.created_at
                                                            ? `Edited ${formatDate(ref.updated_at)}`
                                                            : `Created ${formatDate(ref.created_at)}`}
                                                    </p>
                                                </div>
                                            )}

                                            {related.length > 0 && (
                                                <div className="mt-4 flex flex-wrap gap-2 border-t border-border/20 pt-3">
                                                    {related.map((el: any) => (
                                                        <span key={el.id} className="text-[10px] bg-accent/50 text-muted-foreground px-2 py-1 rounded-full flex items-center gap-1">
                                                            <Layers size={8} />
                                                            {el.title}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Sidebar Actions */}
                    <div className="space-y-6">
                        <button
                            onClick={handleSuggestGaps}
                            disabled={isBrainstorming}
                            className="w-full py-4 bg-primary/10 border border-primary/20 hover:bg-primary/20 rounded-xl text-primary font-bold shadow-sm transition-all flex flex-col items-center justify-center gap-2 group disabled:opacity-50"
                        >
                            <Feather size={20} className={isBrainstorming ? "animate-spin" : "group-hover:scale-110 transition-transform"} />
                             {isBrainstorming ? <><span className="font-serif font-semibold">The Muse</span> is thinking...</> : "✨ Suggest Research Gaps"}
                        </button>

                        {brainstormSuggestions && (
                            <div className="bg-accent/20 p-5 rounded-xl border border-border/50 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-bold flex items-center gap-2">
                                        <Feather size={14} className="text-yellow-500" />
                                        Suggested Focus:
                                    </h4>
                                    <button onClick={() => setBrainstormSuggestions(null)}>
                                        <X size={14} className="text-muted-foreground hover:text-foreground" />
                                    </button>
                                </div>
                                <div className="text-xs text-muted-foreground prose prose-invert leading-relaxed mb-4">
                                    {brainstormSuggestions.split('\n').map((line, i) => (
                                        <p key={i} className="mb-2">{line}</p>
                                    ))}
                                </div>
                                <button
                                    onClick={handleSaveSuggestionsAsNote}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                                >
                                    <Save size={14} />
                                    Save as Note
                                </button>
                            </div>
                        )}

                        <div className="bg-accent/20 p-4 rounded-xl border border-border/50">
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <Plus size={16} />
                                Collect Info
                            </h3>
                            <div className="flex gap-2 mb-4">
                                <button
                                    onClick={() => { setIsAddingLink(true); setIsAddingNote(false); }}
                                    className={`flex-1 py-2 text-xs rounded-md transition-all ${isAddingLink ? 'bg-primary text-primary-foreground font-bold' : 'bg-background hover:bg-accent border border-border'}`}
                                >
                                    Link
                                </button>
                                <button
                                    onClick={() => { setIsAddingNote(true); setIsAddingLink(false); }}
                                    className={`flex-1 py-2 text-xs rounded-md transition-all ${isAddingNote ? 'bg-primary text-primary-foreground font-bold' : 'bg-background hover:bg-accent border border-border'}`}
                                >
                                    Note
                                </button>
                            </div>

                            {(isAddingLink || isAddingNote) && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    {isAddingLink ? (
                                        <>
                                            <input
                                                type="text"
                                                value={linkTitle}
                                                onChange={e => setLinkTitle(e.target.value)}
                                                className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-primary/50"
                                                placeholder="Link Title (e.g. Monaco F1 Spec)"
                                                autoFocus
                                            />
                                            <input
                                                type="url"
                                                value={linkUrl}
                                                onChange={e => setLinkUrl(e.target.value)}
                                                className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-primary/50"
                                                placeholder="https://wikipedia.org/..."
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <input
                                                type="text"
                                                value={noteTitle}
                                                onChange={e => setNoteTitle(e.target.value)}
                                                className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-primary/50"
                                                placeholder="Note Title"
                                                autoFocus
                                            />
                                            <textarea
                                                value={noteContent}
                                                onChange={e => setNoteContent(e.target.value)}
                                                className="w-full bg-background border border-border rounded px-3 py-2 text-sm h-24 resize-none focus:ring-1 focus:ring-primary/50"
                                                placeholder="Note content..."
                                            />
                                        </>
                                    )}

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
                                            <Tag size={12} />
                                            Extra Meta
                                        </div>
                                        <input
                                            type="text"
                                            value={noteTag}
                                            onChange={e => setNoteTag(e.target.value)}
                                            className="w-full bg-background border border-border rounded px-3 py-2 text-sm"
                                            placeholder="Tag (e.g. Monaco, F1)"
                                        />
                                    </div>

                                    <div className="space-y-2 relative">
                                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
                                            <Layers size={12} />
                                            Linked Elements
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            {selectedElements.map(el => (
                                                <span key={el.id} className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    {el.title}
                                                    <button onClick={() => toggleElementLink(el.id, el.type, el.title)} className="hover:text-foreground">
                                                        <X size={10} />
                                                    </button>
                                                </span>
                                            ))}
                                            {selectedElements.length === 0 && <span className="text-[10px] text-muted-foreground italic px-1">No links selected</span>}
                                        </div>

                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onFocus={() => setShowLinkMenu(true)}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                className="w-full bg-background border border-border rounded px-3 py-2 pr-8 text-sm"
                                                placeholder="Search to link..."
                                            />
                                            <Search size={14} className="absolute right-3 top-2.5 text-muted-foreground" />

                                            {showLinkMenu && (
                                                <div className="absolute bottom-full left-0 w-full mb-2 bg-card border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto z-50">
                                                    <div className="p-1">
                                                        {[...characters, ...worldElements, ...chapters]
                                                            .filter(item => {
                                                                const title = (item as any).name || (item as any).title || '';
                                                                return title.toLowerCase().includes(searchQuery.toLowerCase());
                                                            })
                                                            .slice(0, 10)
                                                            .map(item => {
                                                                const id = item.id;
                                                                const title = (item as any).name || (item as any).title || ((item as any).chapter_number ? `Chapter ${(item as any).chapter_number}` : 'Unknown');
                                                                const type = (item as any).role ? 'character' : (item as any).category ? 'world' : 'chapter';
                                                                const isSelected = selectedElements.some(e => e.id === id);

                                                                return (
                                                                    <button
                                                                        key={id}
                                                                        onClick={() => toggleElementLink(id, type, title)}
                                                                        className={`w-full text-left px-3 py-2 text-xs hover:bg-accent rounded flex items-center justify-between ${isSelected ? 'text-primary font-bold' : ''}`}
                                                                    >
                                                                        <span className="flex items-center gap-2">
                                                                            <span className="opacity-50 uppercase text-[8px]">{type}</span>
                                                                            {title}
                                                                        </span>
                                                                        {isSelected && <Check size={12} />}
                                                                    </button>
                                                                );
                                                            })}
                                                        <div className="p-2 border-t border-border mt-1">
                                                            <button
                                                                onClick={() => setShowLinkMenu(false)}
                                                                className="w-full text-center text-[10px] text-muted-foreground hover:text-foreground"
                                                            >
                                                                Close Menu
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <button
                                            onClick={isAddingLink ? handleAddLink : handleAddNote}
                                            disabled={(isAddingLink && (!linkTitle || !linkUrl)) || (isAddingNote && (!noteTitle || !noteContent))}
                                            className="flex-1 bg-primary text-primary-foreground py-2 rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50 shadow-md"
                                        >
                                            Save Research
                                        </button>
                                        <button
                                            onClick={resetForm}
                                            className="px-3 py-2 bg-accent text-foreground rounded text-sm hover:bg-accent/80"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {!isAddingLink && !isAddingNote && (
                                <p className="text-[10px] text-muted-foreground text-center mt-2 px-2 italic">
                                     Links and notes are automatically indexed for <span className="font-serif font-semibold">The Muse</span> assistant.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
