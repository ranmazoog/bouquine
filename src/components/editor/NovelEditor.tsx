import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useCallback, useRef, useState } from 'react';
import { useEditorStore, useProjectStore } from '../../stores/projectStore';
import { Bold, Italic, Strikethrough, FileText, Loader2, X, ChevronDown, ChevronRight, Heading2, Heading3 } from 'lucide-react';

export function NovelEditor() {
    const { currentChapter, setSaveStatus, setCurrentChapter, pendingInsertion, clearInsert, lastSelection, setSelection } = useEditorStore();
    const { updateChapterInStore } = useProjectStore();
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const titleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLoadedRef = useRef(false);
    const [chapterTitle, setChapterTitle] = useState(currentChapter?.title || '');
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [showSummary, setShowSummary] = useState(false);

    // Initialize title when component mounts (with key prop, this runs once per chapter)
    useEffect(() => {
        if (currentChapter) {
            setChapterTitle(currentChapter.title || '');
        }
    }, [currentChapter?.id]);

    const saveContent = useCallback(async (content: string) => {
        if (!currentChapter) return;

        setSaveStatus('saving');
        try {
            const updated = await window.electronAPI.saveChapterContent(currentChapter.id, content);
            updateChapterInStore(updated);
            setCurrentChapter(updated);
            setSaveStatus('saved');
        } catch (err) {
            console.error('Failed to save chapter:', err);
            setSaveStatus('unsaved');
        }
    }, [currentChapter?.id, setSaveStatus, updateChapterInStore, setCurrentChapter]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        setChapterTitle(newTitle);

        if (!currentChapter) return;

        // Debounce title update - 500ms after typing stops
        if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);
        titleTimeoutRef.current = setTimeout(async () => {
            try {
                const updated = await window.electronAPI.renameChapter(currentChapter.id, newTitle);
                // Update both the chapters list (sidebar) and current chapter
                updateChapterInStore(updated);
                setCurrentChapter(updated);
            } catch (err) {
                console.error('Failed to rename chapter:', err);
            }
        }, 500);
    };

    const handleSummarize = async () => {
        if (!currentChapter || isSummarizing) return;

        setIsSummarizing(true);
        try {
            const updated = await window.electronAPI.summarizeChapter(currentChapter.id, 'openrouter');
            updateChapterInStore(updated);
            setCurrentChapter(updated);
        } catch (err) {
            console.error('Failed to summarize chapter:', err);
            alert('Failed to summarize chapter. Make sure you have content and a valid API key.');
        } finally {
            setIsSummarizing(false);
        }
    };

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
        ],
        editorProps: {
            attributes: {
                class: 'prose prose-lg dark:prose-invert focus:outline-none max-w-none min-h-[500px] pb-32 text-foreground font-serif leading-relaxed prose-h2:text-xl prose-h2:font-bold prose-h2:mt-6 prose-h2:mb-3 prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-4 prose-h3:mb-2',
            },
        },
        onSelectionUpdate: ({ editor }) => {
            const { from, to, empty } = editor.state.selection;

            if (empty) {
                setSelection(null);
            } else {
                // Get the actual text content of the selection
                const text = editor.state.doc.textBetween(from, to, '\n');
                setSelection({ from, to, text });
            }
        },
        onUpdate: ({ editor }) => {
            if (!isLoadedRef.current) return;

            setSaveStatus('unsaved');

            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            saveTimeoutRef.current = setTimeout(() => {
                saveContent(editor.getHTML());
            }, 1500);
        },
    });

    // Load chapter content when editor is ready
    useEffect(() => {
        let isMounted = true;

        const loadContent = async () => {
            if (!currentChapter || !editor) return;

            isLoadedRef.current = false;

            try {
                const fullChapter = await window.electronAPI.getChapter(currentChapter.id);
                if (fullChapter && isMounted) {
                    editor.commands.setContent(fullChapter.content || '');
                    isLoadedRef.current = true;
                }
            } catch (err) {
                console.error('Failed to load chapter content:', err);
            }
        };

        loadContent();

        return () => { isMounted = false; };
    }, [currentChapter?.id, editor]);

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);
        };
    }, []);

    // Watch for content insertion from AI Assistant
    useEffect(() => {
        if (pendingInsertion && editor) {
            const { empty } = editor.state.selection;

            if (!empty) {
                // Text is selected - replace the selection with new content
                editor.chain()
                    .deleteSelection()
                    .insertContent(pendingInsertion)
                    .run();
            } else if (lastSelection) {
                // Use remembered selection from when user asked the question
                editor.chain()
                    .setTextSelection({ from: lastSelection.from, to: lastSelection.to })
                    .insertContent(pendingInsertion)
                    .run();
                setSelection(null);
            } else {
                // No selection - insert at cursor
                editor.chain().focus().insertContent(pendingInsertion).run();
            }
            clearInsert();
        }
    }, [pendingInsertion, editor, clearInsert, lastSelection, setSelection]);
    if (!currentChapter) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <p>Select a chapter to begin writing.</p>
            </div>
        );
    }

    return (
        <div className="w-full editor-wrapper">
            {/* Editable Title - styled as header */}
            <div className="mb-8">
                <div className="flex items-start justify-between gap-4">
                    <input
                        type="text"
                        value={chapterTitle}
                        onChange={handleTitleChange}
                        className="text-4xl font-bold bg-transparent border-none outline-none flex-1 placeholder:text-muted-foreground/50 font-serif text-foreground"
                        placeholder="Chapter Title"
                    />
                    <button
                        onClick={handleSummarize}
                        disabled={isSummarizing}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-accent hover:bg-accent/80 rounded-lg transition-colors disabled:opacity-50 text-muted-foreground hover:text-foreground"
                        title={currentChapter?.summary ? 'Update summary' : 'Generate summary'}
                    >
                        {isSummarizing ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <FileText size={14} />
                        )}
                        <span>{isSummarizing ? 'Summarizing...' : 'Summarize'}</span>
                    </button>
                </div>
                {currentChapter?.summary && (
                    <div className="mt-4 p-3 bg-accent/30 rounded-lg border border-border/50 relative group">
                        <div className="flex items-center justify-between mb-1">
                            <button
                                onClick={() => setShowSummary(!showSummary)}
                                className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                            >
                                {showSummary ? (
                                    <ChevronDown size={12} className="text-muted-foreground" />
                                ) : (
                                    <ChevronRight size={12} className="text-muted-foreground" />
                                )}
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Summary</p>
                            </button>
                            <button
                                onClick={() => setShowSummary(false)}
                                className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100"
                                title="Dismiss summary"
                            >
                                <X size={12} />
                            </button>
                        </div>
                        {showSummary && (
                            <p className="text-sm text-muted-foreground">{currentChapter.summary}</p>
                        )}
                    </div>
                )}
            </div>

            {editor && (
                <BubbleMenu
                    editor={editor}
                    className="flex items-center gap-1 bg-card border border-border rounded-lg shadow-lg p-1"
                >
                    <button
                        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
                        className={`p-2 rounded hover:bg-accent transition-colors ${editor.isActive('bold') ? 'bg-accent text-primary' : 'text-muted-foreground'}`}
                        title="Bold"
                    >
                        <Bold size={16} />
                    </button>
                    <button
                        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
                        className={`p-2 rounded hover:bg-accent transition-colors ${editor.isActive('italic') ? 'bg-accent text-primary' : 'text-muted-foreground'}`}
                        title="Italic"
                    >
                        <Italic size={16} />
                    </button>
                    <button
                        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}
                        className={`p-2 rounded hover:bg-accent transition-colors ${editor.isActive('strike') ? 'bg-accent text-primary' : 'text-muted-foreground'}`}
                        title="Strikethrough"
                    >
                        <Strikethrough size={16} />
                    </button>

                    {/* Vertical divider */}
                    <div className="w-px h-4 bg-border mx-1" />

                    {/* H2 - Section Header */}
                    <button
                        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); }}
                        className={`p-2 rounded hover:bg-accent transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-accent text-primary' : 'text-muted-foreground'}`}
                        title="Section (H2)"
                    >
                        <Heading2 size={16} />
                    </button>

                    {/* H3 - Sub-section Header */}
                    <button
                        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run(); }}
                        className={`p-2 rounded hover:bg-accent transition-colors ${editor.isActive('heading', { level: 3 }) ? 'bg-accent text-primary' : 'text-muted-foreground'}`}
                        title="Sub-section (H3)"
                    >
                        <Heading3 size={16} />
                    </button>
                </BubbleMenu>
            )}

            <EditorContent editor={editor} />
        </div>
    );
}
