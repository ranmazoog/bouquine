import { useState, useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { Plus, Trash2, ExternalLink, FileText, Link as LinkIcon, Loader2, Tag, Layers, Search, X, Check, Save, Edit3, Feather, Sparkles } from 'lucide-react';
import type { Reference, Character, WorldElement, Chapter } from '../../types/electron';
import { motion, AnimatePresence } from 'framer-motion';

export function ResearchPanel() {
    const { currentProject } = useProjectStore();
    const [references, setReferences] = useState<Reference[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Form state
    const [isFABExpanded, setIsFABExpanded] = useState(false);
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
        setIsFABExpanded(false);
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
            <div className="max-w-4xl mx-auto pb-32">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold mb-2">Research & References</h1>
                    <p className="text-muted-foreground text-sm">
                        Collect links and notes for your world building.
                    </p>
                </div>

                {/* Search Bar */}
                <div className="relative mb-8">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <input
                        type="text"
                        value={listSearchQuery}
                        onChange={(e) => setListSearchQuery(e.target.value)}
                        placeholder="Search notes, links, tags..."
                        className="w-full bg-accent/20 border border-border/50 rounded-2xl py-4 pl-12 pr-12 focus:ring-4 focus:ring-primary/10 transition-all text-base shadow-sm"
                    />
                    {listSearchQuery && (
                        <button
                            onClick={() => setListSearchQuery('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-accent rounded-full text-muted-foreground transition-colors"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                    {/* Main Content Area */}
                    <div className="flex-1 space-y-6">
                        {isLoading ? (
                            <div className="flex items-center justify-center p-12">
                                <Loader2 className="animate-spin text-primary" size={32} />
                            </div>
                        ) : filteredReferences.length === 0 ? (
                            <div className="text-center p-20 border-2 border-dashed border-border/50 rounded-2xl text-muted-foreground bg-accent/5 shadow-inner">
                                {listSearchQuery ? (
                                    <div className="space-y-4">
                                        <p className="text-lg">No matches found for "{listSearchQuery}"</p>
                                        <button
                                            onClick={() => setListSearchQuery('')}
                                            className="text-primary hover:underline font-bold"
                                        >
                                            Clear search
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4 border border-border/50">
                                            <Layers size={32} className="text-muted-foreground/30" />
                                        </div>
                                        <p className="text-lg font-bold opacity-80">Your research vault is empty.</p>
                                        <p className="text-sm opacity-60">Use the floating button in the corner to add links and notes.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                <AnimatePresence initial={false}>
                                    {filteredReferences.map(ref => {
                                        const related = ref.related_elements ? JSON.parse(ref.related_elements) : [];
                                        return (
                                            <motion.div
                                                key={ref.id}
                                                layout
                                                initial={{ opacity: 0, scale: 0.98 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.98 }}
                                                className="bg-accent/30 border border-border/50 rounded-2xl p-6 group hover:border-primary/30 hover:bg-accent/50 transition-all duration-300 shadow-sm hover:shadow-md"
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex flex-col gap-2">
                                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ref.type === 'link' ? 'bg-blue-500/10 text-blue-500' : 'bg-yellow-500/10 text-yellow-500'} border border-current/10`}>
                                                                {ref.type === 'link' ? <LinkIcon size={16} /> : <FileText size={16} />}
                                                            </div>
                                                            {highlightMatch(ref.title, listSearchQuery)}
                                                        </h3>
                                                        {ref.tag && (
                                                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center gap-1.5 w-fit font-bold uppercase tracking-wider border border-primary/20">
                                                                <Tag size={10} />
                                                                {highlightMatch(ref.tag, listSearchQuery)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {ref.type !== 'link' && (
                                                            <button
                                                                onClick={() => startEditingNote(ref)}
                                                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg sm:opacity-0 group-hover:opacity-100 transition-all"
                                                                title="Edit note"
                                                            >
                                                                <Edit3 size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDelete(ref.id)}
                                                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg sm:opacity-0 group-hover:opacity-100 transition-all"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                                {ref.type === 'link' ? (
                                                    <button
                                                        onClick={() => openLink(ref.url!)}
                                                        className="text-sm text-primary hover:underline flex items-center gap-2 mt-2 bg-primary/5 px-3 py-2 rounded-lg w-fit transition-colors group/link border border-primary/10 shadow-sm"
                                                    >
                                                        <ExternalLink size={14} className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                                                        <span className="truncate max-w-xs">{ref.url}</span>
                                                    </button>
                                                ) : editingNote?.id === ref.id ? (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        className="mt-4 space-y-4"
                                                    >
                                                        <textarea
                                                            value={editContent}
                                                            onChange={(e) => setEditContent(e.target.value)}
                                                            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm h-40 resize-none focus:ring-4 focus:ring-primary/10 font-serif shadow-inner transition-all"
                                                            placeholder="Note content..."
                                                        />
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={saveEditedNote}
                                                                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 active:scale-95"
                                                            >
                                                                Save Changes
                                                            </button>
                                                            <button
                                                                onClick={cancelEditingNote}
                                                                className="px-4 py-2.5 bg-accent text-foreground rounded-xl font-semibold hover:bg-accent/80 transition-all active:scale-95"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                ) : (
                                                    <div>
                                                        <div className="text-sm text-muted-foreground whitespace-pre-wrap mt-3 font-serif leading-relaxed line-clamp-6 opacity-80 group-hover:opacity-100 transition-opacity">
                                                            {highlightMatch(ref.content || '', listSearchQuery)}
                                                        </div>
                                                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30">
                                                            <p className="text-[10px] text-muted-foreground/40">
                                                                {ref.updated_at !== ref.created_at
                                                                    ? `Edited ${formatDate(ref.updated_at)}`
                                                                    : `Added ${formatDate(ref.created_at)}`}
                                                            </p>
                                                            {related.length > 0 && (
                                                                <div className="flex flex-wrap gap-1.5 justify-end">
                                                                    {related.map((el: any) => (
                                                                        <span key={el.id} className="text-[9px] bg-accent/50 text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1 border border-border/50 font-medium">
                                                                            <Layers size={8} className="opacity-50" />
                                                                            {el.title}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {/* Muse Suggestions Sidebar */}
                    <div className="w-full md:w-72 space-y-6">
                        <div className="p-6 bg-primary/5 border border-primary/20 rounded-2xl space-y-4 shadow-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <Feather size={18} />
                                </div>
                                <h3 className="font-bold">The Muse</h3>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Let AI analyze your story and suggest critical research gaps.
                            </p>
                            <button
                                onClick={handleSuggestGaps}
                                disabled={isBrainstorming}
                                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isBrainstorming ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Sparkles size={16} />
                                )}
                                {isBrainstorming ? "Analyzing..." : "Suggest Gaps"}
                            </button>
                        </div>

                        <AnimatePresence>
                            {brainstormSuggestions && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="bg-card p-6 rounded-2xl border border-border shadow-xl space-y-6"
                                >
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-bold flex items-center gap-2">
                                            <Feather size={14} className="text-yellow-500" />
                                            Suggested Focus
                                        </h4>
                                        <button onClick={() => setBrainstormSuggestions(null)} className="p-1 hover:bg-accent rounded-full transition-colors text-muted-foreground">
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <div className="text-xs text-muted-foreground prose prose-invert leading-relaxed max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                        {brainstormSuggestions.split('\n').filter(l => l.trim()).map((line, i) => (
                                            <p key={i} className="mb-2 italic border-l-2 border-primary/20 pl-2 opacity-80">{line}</p>
                                        ))}
                                    </div>
                                    <button
                                        onClick={handleSaveSuggestionsAsNote}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent/80 text-foreground rounded-xl text-xs font-bold transition-all border border-border/50 active:scale-95"
                                    >
                                        <Save size={14} />
                                        Save as Project Note
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* RESEARCH FAB */}
            <div className="fixed bottom-8 right-8 z-[60] flex flex-col items-end gap-3">
                {/* Action Bubbles */}
                <AnimatePresence>
                    {isFABExpanded && (
                        <div className="flex flex-col items-end gap-3 mb-1">
                            <motion.button
                                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                                transition={{ delay: 0.05 }}
                                onClick={() => { setIsAddingNote(true); setIsFABExpanded(false); }}
                                className="flex items-center gap-3 px-5 py-3.5 bg-card border border-border rounded-2xl shadow-2xl hover:bg-accent transition-all group/btn active:scale-95"
                            >
                                <span className="text-xs font-bold">📝 Add Research Note</span>
                                <div className="w-10 h-10 bg-yellow-500/10 text-yellow-500 rounded-xl flex items-center justify-center group-hover/btn:scale-110 transition-transform border border-yellow-500/20 shadow-sm">
                                    <FileText size={18} />
                                </div>
                            </motion.button>
                            <motion.button
                                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                                onClick={() => { setIsAddingLink(true); setIsFABExpanded(false); }}
                                className="flex items-center gap-3 px-5 py-3.5 bg-card border border-border rounded-2xl shadow-2xl hover:bg-accent transition-all group/btn active:scale-95"
                            >
                                <span className="text-xs font-bold">🔗 Add Research Link</span>
                                <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center group-hover/btn:scale-110 transition-transform border border-blue-500/20 shadow-sm">
                                    <LinkIcon size={18} />
                                </div>
                            </motion.button>
                        </div>
                    )}
                </AnimatePresence>

                {/* Main FAB Toggle */}
                <motion.button
                    onClick={() => setIsFABExpanded(!isFABExpanded)}
                    animate={{
                        rotate: isFABExpanded ? 45 : 0,
                        backgroundColor: isFABExpanded ? 'var(--accent)' : '#2563eb', // Blue-600
                        color: isFABExpanded ? 'var(--foreground)' : '#ffffff'
                    }}
                    className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-90 border border-border/20"
                >
                    <Plus size={32} />
                </motion.button>
            </div>

            {/* ADD LINK/NOTE MODALS */}
            <AnimatePresence>
                {(isAddingLink || isAddingNote) && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={resetForm}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6 border-b border-border/50 bg-accent/5 flex items-center justify-between">
                                <h2 className="text-xl font-bold flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isAddingLink ? 'bg-blue-500/10 text-blue-500' : 'bg-yellow-500/10 text-yellow-500'} border border-current/10 shadow-sm`}>
                                        {isAddingLink ? <LinkIcon size={20} /> : <FileText size={20} />}
                                    </div>
                                    {isAddingLink ? 'Add Research Link' : 'Add Research Note'}
                                </h2>
                                <button onClick={resetForm} className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 overflow-y-auto space-y-6">
                                {isAddingLink ? (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 opacity-70">Source Title</label>
                                            <input
                                                type="text"
                                                value={linkTitle}
                                                onChange={e => setLinkTitle(e.target.value)}
                                                className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-sm focus:ring-4 focus:ring-primary/10 transition-all font-bold shadow-inner"
                                                placeholder="e.g. Monaco F1 Technical Specs"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 opacity-70">URL</label>
                                            <input
                                                type="url"
                                                value={linkUrl}
                                                onChange={e => setLinkUrl(e.target.value)}
                                                className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-sm focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
                                                placeholder="https://wikipedia.org/wiki/Monaco_Grand_Prix"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 opacity-70">Note Title</label>
                                            <input
                                                type="text"
                                                value={noteTitle}
                                                onChange={e => setNoteTitle(e.target.value)}
                                                className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-sm focus:ring-4 focus:ring-primary/10 transition-all font-bold shadow-inner"
                                                placeholder="e.g. Key Plot Points for Finale"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 opacity-70">Content</label>
                                            <textarea
                                                value={noteContent}
                                                onChange={e => setNoteContent(e.target.value)}
                                                className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-sm h-40 resize-none focus:ring-4 focus:ring-primary/10 transition-all font-serif leading-relaxed shadow-inner"
                                                placeholder="Type your notes here..."
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 flex items-center gap-2 opacity-70">
                                            <Tag size={12} /> Search Tags
                                        </label>
                                        <input
                                            type="text"
                                            value={noteTag}
                                            onChange={e => setNoteTag(e.target.value)}
                                            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
                                            placeholder="e.g. World Building, Plot"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 flex items-center gap-2 opacity-70">
                                            <Layers size={12} /> Linked Elements
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onFocus={() => setShowLinkMenu(true)}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                className="w-full bg-background border border-border rounded-xl px-4 py-3 pr-10 text-sm focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
                                                placeholder="Search to link..."
                                            />
                                            <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground opacity-50" />

                                            <AnimatePresence>
                                                {showLinkMenu && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        className="absolute bottom-full left-0 w-full mb-2 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-above-all flex flex-col"
                                                    >
                                                        <div className="p-2 space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
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
                                                                            className={`w-full text-left px-3 py-2.5 text-xs hover:bg-accent rounded-lg flex items-center justify-between transition-colors ${isSelected ? 'bg-primary/10 text-primary font-bold' : ''}`}
                                                                        >
                                                                            <div className="flex flex-col">
                                                                                <span className="opacity-40 uppercase text-[8px] font-bold tracking-widest">{type}</span>
                                                                                <span>{title}</span>
                                                                            </div>
                                                                            {isSelected && <Check size={14} />}
                                                                        </button>
                                                                    );
                                                                })}
                                                        </div>
                                                        <div className="p-2 bg-accent/30 border-t border-border/50">
                                                            <button
                                                                onClick={() => setShowLinkMenu(false)}
                                                                className="w-full text-center py-2 text-[10px] text-muted-foreground hover:text-foreground font-bold uppercase tracking-wider bg-card rounded-lg transition-colors border border-border/50 shadow-sm"
                                                            >
                                                                Done Linking
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>

                                {selectedElements.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 p-3 bg-accent/20 rounded-xl border border-border/50 shadow-inner">
                                        {selectedElements.map(el => (
                                            <span key={el.id} className="text-[10px] bg-primary/20 text-primary px-2.5 py-1 rounded-full flex items-center gap-1.5 font-bold border border-primary/20 shadow-sm">
                                                {el.title}
                                                <button onClick={() => toggleElementLink(el.id, el.type, el.title)} className="hover:text-primary-foreground hover:bg-primary rounded-full transition-colors p-0.5">
                                                    <X size={10} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="p-6 bg-accent/5 border-t border-border/50 flex gap-3">
                                <button
                                    onClick={resetForm}
                                    className="flex-1 py-3 bg-accent hover:bg-accent/80 text-foreground rounded-xl font-bold transition-all active:scale-95"
                                >
                                    Discard
                                </button>
                                <button
                                    onClick={isAddingLink ? handleAddLink : handleAddNote}
                                    disabled={(isAddingLink && (!linkTitle || !linkUrl)) || (isAddingNote && (!noteTitle || !noteContent))}
                                    className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20"
                                >
                                    Save Research
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
