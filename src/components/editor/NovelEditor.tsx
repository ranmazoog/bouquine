import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useCallback, useRef, useState } from 'react';
import { useEditorStore, useProjectStore } from '../../stores/projectStore';
import { toast } from '../../lib/toast';
import { friendlyAIError } from '../../lib/aiError';
import { Bold, Italic, Strikethrough, FileText, Loader2, X, Heading2, Heading3, Feather } from 'lucide-react';

export function NovelEditor() {
    const {
        currentChapter, setSaveStatus, setCurrentChapter, pendingInsertion,
        clearInsert, lastSelection, setSelection, isFocusMode, triggerAudit,
        isAuditing
    } = useEditorStore();
    const { updateChapterInStore, currentProject } = useProjectStore();
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const titleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLoadedRef = useRef(false);
    const [chapterTitle, setChapterTitle] = useState(currentChapter?.title || '');
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [showFocusExitToast, setShowFocusExitToast] = useState(false);
    const [showAuditTooltip, setShowAuditTooltip] = useState(false);

    // Point-of-View Mismatch State
    const [showPOVWarning, setShowPOVWarning] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        const hasSeen = localStorage.getItem('hasSeenAuditTooltip');
        if (!hasSeen) {
            const timer = setTimeout(() => setShowAuditTooltip(true), 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAuditClick = () => {
        if (showAuditTooltip) {
            localStorage.setItem('hasSeenAuditTooltip', 'true');
            setShowAuditTooltip(false);
        }
        triggerAudit(true);
        // We stay on the chapter now as requested
    };

    // Track Focus Mode exit
    const prevFocusModeRef = useRef(isFocusMode);

    useEffect(() => {
        if (prevFocusModeRef.current === true && isFocusMode === false) {
            // User just exited Focus Mode
            setShowFocusExitToast(true);
            // Hide after 8 seconds
            setTimeout(() => setShowFocusExitToast(false), 8000);
        }
        prevFocusModeRef.current = isFocusMode;
    }, [isFocusMode]);

    // Point-of-View Mismatch Detection
    useEffect(() => {
        const checkStyleDrift = async () => {
            if (!currentChapter || !currentProject || isDismissed) {
                setShowPOVWarning(false);
                return;
            }

            try {
                const styleGuide = await window.electronAPI.getStyleGuide(currentProject.id);
                const pov = styleGuide?.pov?.toLowerCase() || '';

                if (!pov.includes('third')) {
                    setShowPOVWarning(false);
                    return;
                }

                // Filter content to remove dialogue
                const content = currentChapter.content || '';
                // Robust dialogue stripping (standard quotes + curly quotes)
                const narrativeOnly = content.replace(/"[^"]*"/g, "").replace(/[“”][^“”]*[“”]/g, "");

                // Count 1st person pronouns: I (case-sensitive), me, my, mine (case-insensitive)
                const matchesI = narrativeOnly.match(/\bI\b/g) || [];
                const matchesOthers = narrativeOnly.match(/\b(me|my|mine)\b/gi) || [];
                const firstCount = matchesI.length + matchesOthers.length;

                if (firstCount > 2) {
                    setShowPOVWarning(true);
                } else {
                    setShowPOVWarning(false);
                }
            } catch (err) {
                console.error('Failed to check style drift:', err);
            }
        };

        const timer = setTimeout(checkStyleDrift, 1000); // 1s delay
        return () => clearTimeout(timer);
    }, [currentChapter?.content, currentChapter?.id, currentProject?.id, isDismissed]);

    // Reset dismissal when chapter changes
    useEffect(() => {
        setIsDismissed(false);
        if (currentChapter?.summary) {
            setShowSummary(true);
        } else {
            setShowSummary(false);
        }
    }, [currentChapter?.id]);

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
            toast.error('Unable to save your changes. Your latest edits are not saved yet.');
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
                toast.error('Unable to save the chapter title.');
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
            setShowSummary(true);
            toast.success('Chapter summary updated.');
        } catch (err) {
            console.error('Failed to summarize chapter:', err);
            toast.error(friendlyAIError(err));
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
                toast.error('Unable to load this chapter. Try selecting it again.');
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
        <div className="w-full editor-wrapper relative">
            {/* Point-of-View Mismatch Banner (Style Guide enforcement) */}
            {showPOVWarning && !isDismissed && !isFocusMode && (
                <div className="my-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between animate-in slide-in-from-top duration-300 shadow-sm">
                    <div className="flex items-center gap-2 text-amber-800 text-sm">
                        <span className="text-lg">⚠️</span>
                        <p><strong>Point-of-View Mismatch:</strong> This chapter uses first person ("I", "my"), but your Style Guide sets the point of view to Third Person. If that's intentional, dismiss this — otherwise revise to match, or change the POV in your Style Guide.</p>
                    </div>
                    <button
                        onClick={() => setIsDismissed(true)}
                        className="text-amber-500 hover:text-amber-700 px-2 font-bold"
                    >
                        ✕
                    </button>
                </div>
            )}

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
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <button
                                onClick={handleAuditClick}
                                disabled={isAuditing}
                                className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all border max-w-[90px] ${isAuditing ? 'bg-primary/10 border-primary animate-pulse' : 'bg-accent/50 hover:bg-accent border-transparent text-muted-foreground hover:text-primary hover:border-primary/30'}`}
                                title="Run a Story Consistency Check — checks story facts and continuity against your Characters, World, and Synopsis. Does not check writing style."
                            >
                                {isAuditing ? (
                                    <Loader2 size={16} className="animate-spin text-primary" />
                                ) : (
                                    <Feather size={16} />
                                )}
                                <span className="text-[10px] uppercase tracking-tighter mt-1 font-extrabold opacity-80 text-center leading-tight">Story Consistency Check</span>
                            </button>

                            {showAuditTooltip && (
                                <div className="absolute top-full right-0 mt-3 w-64 p-4 bg-primary text-primary-foreground rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in slide-in-from-top-2 duration-300">
                                    <div className="absolute -top-1.5 right-6 w-3 h-3 bg-primary rotate-45" />
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-sm flex items-center gap-2">
                                            <Feather size={14} /> Story Consistency Check
                                        </h4>
                                        <button onClick={() => { setShowAuditTooltip(false); localStorage.setItem('hasSeenAuditTooltip', 'true'); }} className="hover:opacity-70">
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <p className="text-xs leading-relaxed opacity-90">
                                        Checks story facts and continuity against your Characters, World, and Synopsis. Does not check writing style.
                                    </p>
                                    <button
                                        onClick={() => { setShowAuditTooltip(false); localStorage.setItem('hasSeenAuditTooltip', 'true'); }}
                                        className="mt-3 w-full py-1.5 bg-white/20 hover:bg-white/30 rounded text-xs font-semibold transition-colors"
                                    >
                                        Got it
                                    </button>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleSummarize}
                            disabled={isSummarizing}
                            className="flex items-center gap-2 px-3 py-3 text-sm bg-accent hover:bg-accent/80 rounded-lg transition-colors disabled:opacity-50 text-muted-foreground hover:text-foreground h-[41px]"
                            title={currentChapter?.summary ? 'Update summary' : 'Generate summary'}
                        >
                            {isSummarizing ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <FileText size={14} />
                            )}
                            <span className="font-medium">
                                {isSummarizing ? 'Summarizing...' : (currentChapter?.summary && !showSummary ? 'Show Summary' : 'Summarize')}
                            </span>
                        </button>
                    </div>
                </div>
                {currentChapter?.summary && showSummary && (
                    <div className="mt-4 p-3 bg-accent/30 rounded-lg border border-border/50 relative group animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Summary</p>
                            </div>
                            <button
                                onClick={() => setShowSummary(false)}
                                className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                                title="Dismiss summary"
                            >
                                <X size={12} />
                            </button>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{currentChapter.summary}</p>
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

            {/* Focus Mode Exit Notification */}
            {showFocusExitToast && (
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-card border border-border shadow-2xl rounded-2xl p-4 flex items-center gap-4 max-w-md">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Feather size={20} />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold">Session finished</h4>
                            <p className="text-xs text-muted-foreground">Run a Story Consistency Check on this chapter for plot, character, and world contradictions?</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    triggerAudit(true);
                                    setShowFocusExitToast(false);
                                }}
                                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors"
                            >
                                Run Check
                            </button>
                            <button
                                onClick={() => setShowFocusExitToast(false)}
                                className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
