import { useState, useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { Plus, Trash2, ExternalLink, FileText, Link as LinkIcon, Loader2 } from 'lucide-react';
import type { Reference } from '../../types/electron';

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

    useEffect(() => {
        if (currentProject) {
            loadReferences();
        }
    }, [currentProject?.id]);

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
                type: 'link'
            });
            setLinkTitle('');
            setLinkUrl('');
            setIsAddingLink(false);
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
                type: 'note'
            });
            setNoteTitle('');
            setNoteContent('');
            setIsAddingNote(false);
            loadReferences();
        } catch (err) {
            console.error('Failed to add note:', err);
        }
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

    const openLink = (url: string) => {
        window.electronAPI.openLink(url);
    };

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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Main Content Area */}
                    <div className="md:col-span-2 space-y-6">
                        {isLoading ? (
                            <div className="flex items-center justify-center p-8">
                                <Loader2 className="animate-spin text-muted-foreground" />
                            </div>
                        ) : references.length === 0 ? (
                            <div className="text-center p-12 border-2 border-dashed border-border/50 rounded-xl text-muted-foreground">
                                No references added yet.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {references.map(ref => (
                                    <div key={ref.id} className="bg-accent/30 border border-border/50 rounded-lg p-4 group">
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className="font-semibold flex items-center gap-2">
                                                {ref.type === 'link' ? <LinkIcon size={14} className="text-blue-400" /> : <FileText size={14} className="text-yellow-400" />}
                                                {ref.title}
                                            </h3>
                                            <button
                                                onClick={() => handleDelete(ref.id)}
                                                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        {ref.type === 'link' ? (
                                            <button
                                                onClick={() => openLink(ref.url!)}
                                                className="text-sm text-primary hover:underline flex items-center gap-1 mt-2"
                                            >
                                                <ExternalLink size={12} />
                                                {ref.url}
                                            </button>
                                        ) : (
                                            <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-2">{ref.content}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sidebar Actions */}
                    <div className="space-y-6">
                        <div className="bg-accent/20 p-4 rounded-xl border border-border/50">
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <LinkIcon size={16} />
                                Add Link
                            </h3>
                            {isAddingLink ? (
                                <div className="space-y-3" onSubmit={handleAddLink}>
                                    <input
                                        type="text"
                                        value={linkTitle}
                                        onChange={e => setLinkTitle(e.target.value)}
                                        className="w-full bg-background border border-border rounded px-3 py-2 text-sm"
                                        placeholder="Title"
                                        autoFocus
                                    />
                                    <input
                                        type="url"
                                        value={linkUrl}
                                        onChange={e => setLinkUrl(e.target.value)}
                                        className="w-full bg-background border border-border rounded px-3 py-2 text-sm"
                                        placeholder="https://..."
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleAddLink}
                                            disabled={!linkTitle || !linkUrl}
                                            className="flex-1 bg-primary text-primary-foreground py-2 rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => setIsAddingLink(false)}
                                            className="px-3 py-2 bg-accent text-foreground rounded text-sm"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsAddingLink(true)}
                                    className="w-full py-2 border border-dashed border-border rounded text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus size={14} />
                                    Add New Link
                                </button>
                            )}
                        </div>

                        <div className="bg-accent/20 p-4 rounded-xl border border-border/50">
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <FileText size={16} />
                                Add Note
                            </h3>
                            {isAddingNote ? (
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        value={noteTitle}
                                        onChange={e => setNoteTitle(e.target.value)}
                                        className="w-full bg-background border border-border rounded px-3 py-2 text-sm"
                                        placeholder="Note Title"
                                        autoFocus
                                    />
                                    <textarea
                                        value={noteContent}
                                        onChange={e => setNoteContent(e.target.value)}
                                        className="w-full bg-background border border-border rounded px-3 py-2 text-sm h-24 resize-none"
                                        placeholder="Note content..."
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleAddNote}
                                            disabled={!noteTitle || !noteContent}
                                            className="flex-1 bg-primary text-primary-foreground py-2 rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => setIsAddingNote(false)}
                                            className="px-3 py-2 bg-accent text-foreground rounded text-sm"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsAddingNote(true)}
                                    className="w-full py-2 border border-dashed border-border rounded text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus size={14} />
                                    Add New Note
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
