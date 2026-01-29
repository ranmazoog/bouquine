import { Send, Feather, Sparkles, User, Trash2, FileText, Loader2, ChevronDown, ChevronRight, ArrowLeft, Copy, Check, X, RotateCcw, Wand2, StretchVertical, Scissors, MessageSquare, Settings, Link as LinkIcon, Plus, ExternalLink, Shield } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useProjectStore, useEditorStore } from '../../stores/projectStore';
import type { AIProvider } from '../../types/electron';
import { debounce } from 'lodash';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

const PROVIDER_LABELS: Record<AIProvider, string> = {
    openai: 'GPT-4',
    anthropic: 'Claude',
    openrouter: 'OpenRouter',
};

const MAX_PREVIEW_LENGTH = 3000;

interface AIAssistantProps {
    onSettingsClick?: () => void;
}

interface RelevantResearch {
    id: string;
    title: string;
    type: 'note' | 'link';
    content?: string;
    preview: string;
    url?: string;
}

export function AIAssistant({ onSettingsClick }: AIAssistantProps) {
    const { currentProject, updateChapterInStore } = useProjectStore();
    const {
        currentChapter, setCurrentChapter, triggerInsert, lastSelection,
        setSelection, activeBeat, setActiveBeat, isAuditing, setIsAuditing,
        pendingAudit, triggerAudit, setActiveSidebarTab
    } = useEditorStore();

    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'assistant', content: "Hello! I'm your creative partner. I can see your current chapter and help with ideas, feedback, or rewrites. What would you like to work on?" }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<AIProvider>('openrouter');
    const [showProviderMenu, setShowProviderMenu] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [expandedMsgIdx, setExpandedMsgIdx] = useState<number | null>(null);
    const [relevantResearch, setRelevantResearch] = useState<RelevantResearch[]>([]);
    const [isContextExpanded, setIsContextExpanded] = useState(true);
    const [isQuickAdding, setIsQuickAdding] = useState(false);
    const [quickAddType, setQuickAddType] = useState<'note' | 'link'>('note');
    const [quickAddTitle, setQuickAddTitle] = useState('');
    const [quickAddContent, setQuickAddContent] = useState('');
    const [quickAddUrl, setQuickAddUrl] = useState('');
    const [activeResearchPreview, setActiveResearchPreview] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Setup stream listener
    useEffect(() => {
        window.electronAPI.onAIChatChunk((chunk) => {
            setMessages((prev) => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                    return [
                        ...prev.slice(0, -1),
                        { ...lastMsg, content: lastMsg.content + chunk }
                    ];
                }
                return prev;
            });
        });

        return () => {
            window.electronAPI.removeAIChatListener();
        };
    }, []);

    const handleAudit = useCallback(async () => {
        if (!currentProject || !currentChapter || isLoading || isAuditing) return;

        setIsAuditing(true);
        setMessages(prev => [...prev, {
            role: 'assistant',
            content: `🛡️ **The Muse is performing a Story Audit...**\n\nChecking chapter "${currentChapter.title || currentChapter.chapter_number}" against character arcs, world elements, and synopsis context. This deep analysis ensures your narrative remains logically consistent.`
        }]);

        try {
            const result = await window.electronAPI.auditChapterConsistency({
                projectId: currentProject.id,
                chapterId: currentChapter.id,
                provider: selectedProvider
            });

            setMessages(prev => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: `🛡️ **Integrity Check Results:**\n\n${result}` }
            ]);
        } catch (err) {
            console.error('Audit failed:', err);
            setMessages(prev => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: '🛡️ Audit failed. Ensure you have character and synopsis context in your Vault.' }
            ]);
        } finally {
            setIsAuditing(false);
        }
    }, [currentProject, currentChapter, isLoading, isAuditing, selectedProvider, setIsAuditing]);

    useEffect(() => {
        if (pendingAudit) {
            handleAudit();
            triggerAudit(false); // Reset the flag
        }
    }, [pendingAudit, handleAudit, triggerAudit]);

    const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);

    useEffect(() => {
        if (activeBeat && currentChapter && isHistoryLoaded) {
            const prompt = `I'm ready to write this chapter. Here is the outline:\n\n${activeBeat}\n\nWrite the opening scene.`;
            setMessages(prev => [...prev, { role: 'user', content: prompt }]);
            setActiveBeat(null);
            // Auto-send the message once added
            setTimeout(() => handleSend(prompt), 100);
        }
    }, [activeBeat, currentChapter, setActiveBeat, isHistoryLoaded]);

    // Load chat history when chapter changes
    useEffect(() => {
        const loadChatHistory = async () => {
            setIsHistoryLoaded(false); // Reset loading state
            if (!currentChapter) return;
            try {
                const chapter = await window.electronAPI.getChapter(currentChapter.id);
                if (chapter?.chat_history) {
                    const history = JSON.parse(chapter.chat_history);
                    if (Array.isArray(history) && history.length > 0) {
                        setMessages(history);
                    } else {
                        setMessages([{ role: 'assistant', content: "Hello! I'm your creative partner. I can see your current chapter and help with ideas, feedback, or rewrites. What would you like to work on?" }]);
                    }
                } else {
                    // Only set default welcome message if no history
                    setMessages([
                        { role: 'assistant', content: "Hello! I'm your creative partner. I can see your current chapter and help with ideas, feedback, or rewrites. What would you like to work on?" }
                    ]);
                }
            } catch (err) {
                console.error('Failed to load chat history:', err);
            } finally {
                setIsHistoryLoaded(true);
            }
        };
        loadChatHistory();
    }, [currentChapter?.id]);

    // Save chat history when messages change
    useEffect(() => {
        if (!currentChapter) return;
        const saveChatHistory = debounce(async () => {
            try {
                await window.electronAPI.updateChapter(currentChapter.id, {
                    chat_history: JSON.stringify(messages)
                });
            } catch (err) {
                console.error('Failed to save chat history:', err);
            }
        }, 2000);
        saveChatHistory();
        return () => saveChatHistory.cancel();
    }, [messages, currentChapter]);

    // Proactive Research Search (Contextual)
    useEffect(() => {
        const fetchContextualResearch = async () => {
            if (!currentProject || !currentChapter) {
                setRelevantResearch([]);
                return;
            }

            try {
                // 1. Get explicitly linked research
                const linked = await window.electronAPI.getResearchByChapter(currentChapter.id);

                // 2. Get semantically relevant research (limit 3)
                const chapterContent = currentChapter.content || '';
                const semantic = await window.electronAPI.searchResearch(
                    currentProject.id,
                    currentChapter.title + ' ' + chapterContent.slice(0, 500),
                    3,
                    linked.map(r => r.id)
                );

                const mappedLinked: RelevantResearch[] = linked.map(r => ({
                    id: r.id,
                    title: r.title,
                    type: r.type,
                    content: r.content || '',
                    preview: r.content ? r.content.substring(0, 300) : '',
                    url: r.url
                }));

                const mappedSemantic: RelevantResearch[] = (semantic as any[]).map((r, i) => ({
                    id: `semantic-${i}`,
                    title: r.title,
                    type: r.type as 'note' | 'link',
                    content: r.content || '',
                    preview: r.content ? r.content.substring(0, 300) : '',
                    url: r.url
                }));

                setRelevantResearch([...mappedLinked, ...mappedSemantic].slice(0, 5));
            } catch (err) {
                console.error('Failed to fetch contextual research:', err);
            }
        };

        const debouncedFetch = debounce(fetchContextualResearch, 2000);
        debouncedFetch();
        return () => debouncedFetch.cancel();
    }, [currentProject?.id, currentChapter?.id, currentChapter?.content, currentChapter?.title]);

    const handleQuickAdd = async () => {
        if (!currentProject || !currentChapter || !quickAddTitle) return;

        try {
            await window.electronAPI.createReference({
                project_id: currentProject.id,
                title: quickAddTitle,
                content: quickAddType === 'note' ? quickAddContent : undefined,
                url: quickAddType === 'link' ? quickAddUrl : undefined,
                type: quickAddType,
                related_elements: JSON.stringify([{ id: currentChapter.id, type: 'chapter', title: currentChapter.title || 'This Chapter' }]),
                tag: 'Quick Add'
            });

            // Refresh list
            setIsQuickAdding(false);
            setQuickAddTitle('');
            setQuickAddContent('');
            setQuickAddUrl('');

            // Re-trigger global index and then local fetch
            await window.electronAPI.refreshContextIndex(currentProject.id);

            // Explicitly refetch to make it instant
            const linked = await window.electronAPI.getResearchByChapter(currentChapter.id);
            const chapterContent = currentChapter.content || '';
            const semantic = await window.electronAPI.searchResearch(
                currentProject.id,
                currentChapter.title + ' ' + chapterContent.slice(0, 500),
                3,
                linked.map(r => r.id)
            );

            const mappedLinked: RelevantResearch[] = linked.map(r => ({
                id: r.id,
                title: r.title,
                type: r.type,
                content: r.content || '',
                preview: r.content ? r.content.substring(0, 300) : '',
                url: r.url
            }));

            const mappedSemantic: RelevantResearch[] = (semantic as any[]).map((r, i) => ({
                id: `semantic-${i}`,
                title: r.title,
                type: r.type as 'note' | 'link',
                content: r.content || '',
                preview: r.content ? r.content.substring(0, 300) : '',
                url: r.url
            }));

            setRelevantResearch([...mappedLinked, ...mappedSemantic].slice(0, 5));
        } catch (err) {
            console.error('Quick Add failed:', err);
        }
    };

    const handleSend = async (prompt?: string) => {
        const userMsg = prompt || inputValue.trim();
        if (!userMsg || !currentProject || !currentChapter || isLoading) return;

        // Check if API key exists before making the request
        const keyExists = await window.electronAPI.hasAPIKey(selectedProvider);
        if (!keyExists) {
            setMessages(prev => [
                ...prev,
                { role: 'user', content: userMsg },
                { role: 'assistant', content: 'No API key configured. Please click the ⚙️ Settings button to configure your OpenRouter API key (free at https://openrouter.ai/keys).' }
            ]);
            setIsLoading(false);
            return;
        }

        const currentPrompt = userMsg;
        const selectedContext = lastSelection?.text || null;

        setInputValue('');
        setIsLoading(true);

        const displayMsg = selectedContext
            ? `[Re: "${selectedContext.substring(0, 50)}${selectedContext.length > 50 ? '...' : ''}"]\n\n${currentPrompt}`
            : currentPrompt;
        setMessages(prev => [...prev, { role: 'user', content: displayMsg }]);

        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

        try {
            await window.electronAPI.aiChatMessage({
                projectId: currentProject.id,
                chapterId: currentChapter.id,
                message: currentPrompt,
                provider: selectedProvider,
                selectedText: selectedContext
            });

        } catch (err: any) {
            console.error('AI Chat Error:', err);
            const errorMessage = err?.message || err?.toString() || 'Unknown error';
            let userMessage = 'Error: Could not connect to AI. Please check your API settings.';

            if (errorMessage.includes('401') || errorMessage.includes('No cookie auth') || errorMessage.includes('API key')) {
                userMessage = 'Authentication Error: Your API key is missing or invalid. Please open Settings (⚙️) and configure your API key.';
            } else if (errorMessage.includes('429') || errorMessage.includes('rate limit') || errorMessage.includes('free-models-per-day')) {
                userMessage = 'Rate Limit: Free daily limit reached. Add credits to OpenRouter or wait until tomorrow.';
            } else if (errorMessage.includes('insufficient_quota') || errorMessage.includes('quota')) {
                userMessage = 'Quota Exceeded: Your API key has exceeded its quota. Please check your account.';
            } else if (errorMessage.includes('Provider returned error') || errorMessage.includes('provider')) {
                userMessage = 'Provider Error: The AI provider returned an error. Check your API key and quota.';
            }

            setMessages(prev => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: userMessage }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRetry = async () => {
        // Find the last user message to retry (skip the one that's currently loading)
        const lastUserMsgIndex = messages.length - 2;
        if (lastUserMsgIndex < 0) return;

        const lastUserMsg = messages[lastUserMsgIndex];
        if (lastUserMsg.role !== 'user') return;

        // Extract the actual prompt from the message (remove [Re: "..."] prefix if present)
        let promptToRetry = lastUserMsg.content;
        const match = promptToRetry.match(/^\[Re: "([^"]+)"\]\n\n(.+)$/s);
        if (match) {
            promptToRetry = match[2];
        }

        if (!promptToRetry || !currentProject || !currentChapter || isLoading) return;
        await handleSend(promptToRetry);
    };

    const handleQuickAction = async (action: string) => {
        if (!lastSelection?.text) return;
        const prompt = `${action} the following passage:\n\n"${lastSelection.text}"`;
        await handleSend(prompt);
    };

    const handleClear = () => {
        setMessages([{ role: 'assistant', content: "Chat cleared. Ready for new ideas!" }]);
    };

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleSummarize = async () => {
        if (!currentChapter || isSummarizing) return;

        setIsSummarizing(true);
        try {
            const updated = await window.electronAPI.summarizeChapter(currentChapter.id, selectedProvider);
            updateChapterInStore(updated);
            setCurrentChapter(updated);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Summary saved for "${updated.title || 'this chapter'}":\n\n${updated.summary}`
            }]);
        } catch (err) {
            console.error('Failed to summarize chapter:', err);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Failed to summarize chapter. Make sure you have content and a valid API key.'
            }]);
        } finally {
            setIsSummarizing(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!currentProject || !currentChapter) {
        return (
            <div className="w-80 glass flex flex-col h-full border-l items-center justify-center p-6 text-center text-muted-foreground">
                <Sparkles size={24} className="mb-2 opacity-50" />
                <p className="text-sm">Open a project and chapter to start chatting.</p>
            </div>
        );
    }

    return (
        <div className="w-80 glass flex flex-col h-full border-l border-white/5">
            {/* Relevant Research Panel */}
            <div className={`border-b border-blue-500/20 bg-blue-50/50 transition-all duration-300 ${isContextExpanded ? 'ring-1 ring-blue-500/30 shadow-inner' : ''}`}>
                <button
                    onClick={() => setIsContextExpanded(!isContextExpanded)}
                    className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-accent/20 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <LinkIcon size={14} className={`${isContextExpanded ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${isContextExpanded ? 'text-foreground' : 'text-muted-foreground'}`}>
                            Relevant Research
                        </span>
                        {relevantResearch.length > 0 && (
                            <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center shadow-sm">
                                {relevantResearch.length}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {!isContextExpanded && relevantResearch.length > 0 && (
                            <div className="flex -space-x-1.5 overflow-hidden">
                                {relevantResearch.slice(0, 3).map((res, i) => (
                                    <div key={i} className="w-4 h-4 rounded-full bg-accent border border-white/20 flex items-center justify-center">
                                        {res.type === 'link' ? <LinkIcon size={8} className="text-blue-400" /> : <FileText size={8} className="text-yellow-400" />}
                                    </div>
                                ))}
                            </div>
                        )}
                        {isContextExpanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                    </div>
                </button>

                {isContextExpanded && (
                    <div className="px-4 pb-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
                        {isQuickAdding ? (
                            <div className="p-3 bg-card border border-border rounded-lg space-y-3 shadow-md animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setQuickAddType('note')}
                                        className={`flex-1 py-1 text-[10px] rounded border transition-all ${quickAddType === 'note' ? 'bg-primary text-primary-foreground border-primary font-bold' : 'bg-background hover:bg-accent border-border text-muted-foreground'}`}
                                    >
                                        Note
                                    </button>
                                    <button
                                        onClick={() => setQuickAddType('link')}
                                        className={`flex-1 py-1 text-[10px] rounded border transition-all ${quickAddType === 'link' ? 'bg-primary text-primary-foreground border-primary font-bold' : 'bg-background hover:bg-accent border-border text-muted-foreground'}`}
                                    >
                                        Link
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    value={quickAddTitle}
                                    onChange={e => setQuickAddTitle(e.target.value)}
                                    placeholder="Title..."
                                    className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary/50"
                                    autoFocus
                                />
                                {quickAddType === 'note' ? (
                                    <textarea
                                        value={quickAddContent}
                                        onChange={e => setQuickAddContent(e.target.value)}
                                        placeholder="Content..."
                                        className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs h-16 resize-none"
                                    />
                                ) : (
                                    <input
                                        type="url"
                                        value={quickAddUrl}
                                        onChange={e => setQuickAddUrl(e.target.value)}
                                        placeholder="https://..."
                                        className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs"
                                    />
                                )}
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleQuickAdd}
                                        disabled={!quickAddTitle}
                                        className="flex-1 bg-primary text-primary-foreground py-1.5 rounded text-[10px] font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => setIsQuickAdding(false)}
                                        className="px-3 py-1.5 bg-accent text-foreground rounded text-[10px] hover:bg-accent/80 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                {relevantResearch.map((res) => (
                                    <div key={res.id} className="group relative">
                                        <button
                                            onClick={() => setActiveResearchPreview(activeResearchPreview === res.id ? null : res.id)}
                                            className="w-full text-left p-2 rounded-lg bg-accent/10 hover:bg-accent/20 border border-border/20 transition-all flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                {res.type === 'link' ? <LinkIcon size={12} className="text-blue-400" /> : <FileText size={12} className="text-yellow-400" />}
                                                <span className="text-[11px] truncate">{res.title}</span>
                                            </div>
                                            <ChevronRight size={10} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>

                                        {activeResearchPreview === res.id && (
                                            <div className="absolute top-0 right-full mr-2 w-72 bg-card border border-border rounded-lg shadow-2xl p-4 z-[100] animate-in fade-in slide-in-from-right-2 duration-200">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center gap-2 truncate pr-4">
                                                        {res.type === 'link' ? <LinkIcon size={14} className="text-blue-400" /> : <FileText size={14} className="text-yellow-400" />}
                                                        <h4 className="text-xs font-bold truncate">{res.title}</h4>
                                                    </div>
                                                    <button onClick={(e) => { e.stopPropagation(); setActiveResearchPreview(null); }}>
                                                        <X size={14} className="text-muted-foreground hover:text-foreground" />
                                                    </button>
                                                </div>
                                                <div className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar">
                                                    {res.preview}
                                                    {res.preview.length >= 300 && '...'}
                                                </div>
                                                <div className="flex flex-col gap-2 mt-4">
                                                    {res.url && (
                                                        <button
                                                            onClick={() => window.electronAPI.openLink(res.url!)}
                                                            className="w-full py-1.5 bg-blue-500/10 text-blue-400 rounded text-[10px] font-bold hover:bg-blue-500/20 flex items-center justify-center gap-1.5 transition-colors"
                                                        >
                                                            <ExternalLink size={12} />
                                                            Visit Link
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            const structuredPrompt = `I want to focus on this research note:
* Card Title: ${res.title}
* Card Content/Notes: ${res.content || (res.type === 'link' ? `Link to ${res.url}` : 'No additional content')}

The Muse's role is to act as a contextual suggestion engine. Please generate ideas or insights that are directly derived from and expand upon the complete meaning conveyed by BOTH the Title and the Content/Notes above. Ensure your suggestions demonstrate a comprehensive understanding of this integrated information and how it relates to my current chapter, avoiding unrelated concepts.`;
                                                            setInputValue(structuredPrompt);
                                                            setActiveResearchPreview(null);
                                                            setIsContextExpanded(false);
                                                        }}
                                                        className="w-full py-1.5 bg-primary text-primary-foreground rounded text-[10px] font-bold hover:bg-primary/90 flex items-center justify-center gap-1.5 transition-colors"
                                                    >
                                                        <Feather size={12} />
                                                        Consult The Muse
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {relevantResearch.length === 0 && (
                                    <p className="text-[10px] text-muted-foreground text-center py-2 italic">
                                        No linked research for this chapter yet.
                                    </p>
                                )}

                                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                                    <button
                                        onClick={() => setIsQuickAdding(true)}
                                        className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-1 font-bold transition-colors"
                                    >
                                        <Plus size={10} />
                                        Quick Add
                                    </button>
                                    <button
                                        onClick={() => setActiveSidebarTab('research')}
                                        className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium transition-colors"
                                    >
                                        View All
                                        <ChevronRight size={10} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Rebranded Header */}
            <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Feather size={18} className="text-primary" />
                    <h3 className="font-serif font-semibold text-sm tracking-wide">The Muse</h3>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleAudit}
                        disabled={isLoading || isAuditing}
                        className={`group flex flex-col items-center gap-0.5 transition-colors ${isAuditing ? 'text-blue-500 animate-pulse' : 'text-muted-foreground hover:text-blue-500 active:scale-95'}`}
                        title="Run Integrity Check (Your on-call editor)"
                    >
                        {isAuditing ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                        <span className="text-[8px] uppercase font-extrabold tracking-tighter leading-none opacity-80 group-hover:opacity-100 transition-opacity">Story Audit</span>
                    </button>
                    <button
                        onClick={onSettingsClick}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded hover:bg-accent active:scale-95"
                        title="Settings"
                    >
                        <Settings size={16} />
                    </button>
                    <button onClick={handleClear} className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded hover:bg-accent active:scale-95" title="Clear Chat">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {messages.map((msg, index) => {
                    const isExpanded = index === expandedMsgIdx;
                    const isLong = msg.content.length > MAX_PREVIEW_LENGTH;
                    const displayContent = isLong && !isExpanded
                        ? msg.content.slice(0, MAX_PREVIEW_LENGTH).trim() + '...'
                        : msg.content;

                    return (
                        <div
                            key={index}
                            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            {/* Avatars */}
                            <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm
                            ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-purple-600'}
                        `}>
                                {msg.role === 'user' ? <User size={14} /> : <Feather size={14} />}
                            </div>

                            {/* Message Bubble */}
                            <div className={`
                            relative rounded-2xl p-4 pb-8 text-sm max-w-[85%] whitespace-pre-wrap leading-relaxed shadow-sm flex flex-col
                            ${msg.role === 'user'
                                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                                    : 'bg-accent/50 text-card-foreground border border-border/50 rounded-tl-none group'}
                        `}>
                                <span>{displayContent}</span>

                                {isLong && (
                                    <button
                                        onClick={() => setExpandedMsgIdx(isExpanded ? null : index)}
                                        className="text-[10px] font-semibold mt-1 self-start hover:underline opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                                    >
                                        {isExpanded ? 'Show less' : 'Read more'}
                                    </button>
                                )}

                                {isLoading && index === messages.length - 1 && msg.content === '' && (
                                    <span className="animate-pulse">...</span>
                                )}

                                {/* Upgraded Action Toolbar (Only for AI messages) */}
                                {msg.role === 'assistant' && msg.content && !isLoading && (
                                    <div className="absolute -bottom-8 left-0 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-2 z-10">
                                        {/* Insert Button */}
                                        <button
                                            onClick={() => triggerInsert(msg.content)}
                                            className="flex items-center gap-1.5 text-[10px] bg-primary text-primary-foreground px-2.5 py-1.5 rounded-full shadow-md hover:bg-primary/90 hover:scale-105 transition-all font-medium"
                                            title="Insert at cursor"
                                        >
                                            <ArrowLeft size={10} />
                                            Insert
                                        </button>

                                        {/* Retry Button */}
                                        <button
                                            onClick={handleRetry}
                                            className="flex items-center gap-1.5 text-[10px] bg-card border border-border text-foreground px-2.5 py-1.5 rounded-full shadow-md hover:bg-accent hover:scale-105 transition-all"
                                            title="Retry with same prompt"
                                        >
                                            <RotateCcw size={10} />
                                            Retry
                                        </button>

                                        {/* Copy Button */}
                                        <button
                                            onClick={() => handleCopy(msg.content, index)}
                                            className="flex items-center gap-1.5 text-[10px] bg-card border border-border text-foreground px-2.5 py-1.5 rounded-full shadow-md hover:bg-accent hover:scale-105 transition-all"
                                            title="Copy to clipboard"
                                        >
                                            {copiedIndex === index ? <Check size={10} /> : <Copy size={10} />}
                                            {copiedIndex === index ? 'Copied' : 'Copy'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {messages.length === 1 && (
                    <div className="grid grid-cols-1 gap-2 mt-4 px-4">
                        <p className="text-xs text-muted-foreground font-medium mb-1">Quick Actions:</p>
                        <button
                            onClick={handleSummarize}
                            disabled={isSummarizing}
                            className="text-xs text-left p-3 rounded-xl bg-accent/30 hover:bg-accent border border-border/50 transition-colors flex items-center gap-2 group disabled:opacity-50"
                        >
                            <span className="p-1.5 bg-green-500/10 text-green-500 rounded-lg group-hover:bg-green-500/20">
                                {isSummarizing ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                            </span>
                            {isSummarizing ? 'Summarizing...' : 'Save Chapter Summary'}
                        </button>

                        <p className="text-xs text-muted-foreground font-medium mb-1 mt-4">Try asking:</p>
                        <button
                            onClick={() => setInputValue("Describe the atmosphere and setting of this scene.")}
                            className="text-xs text-left p-3 rounded-xl bg-accent/30 hover:bg-accent border border-border/50 transition-colors flex items-center gap-2 group"
                        >
                            <span className="p-1.5 bg-purple-500/10 text-purple-500 rounded-lg group-hover:bg-purple-500/20">🌍</span>
                            Describe Setting
                        </button>
                        <button
                            onClick={() => setInputValue("Analyze the pacing and tone. Is it too slow?")}
                            className="text-xs text-left p-3 rounded-xl bg-accent/30 hover:bg-accent border border-border/50 transition-colors flex items-center gap-2 group"
                        >
                            <span className="p-1.5 bg-orange-500/10 text-orange-500 rounded-lg group-hover:bg-orange-500/20">⚡</span>
                            Check Pacing
                        </button>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t bg-background/50">
                {/* Selection Indicator */}
                {lastSelection && (
                    <div className="mb-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-md flex items-center justify-between">
                        <span className="text-xs text-purple-500 font-medium truncate max-w-[200px]">
                            Selected: "{lastSelection.text.substring(0, 30)}{lastSelection.text.length > 30 ? '...' : ''}"
                        </span>
                        <button
                            onClick={() => setSelection(null)}
                            className="text-purple-500 hover:text-purple-700 p-0.5"
                            title="Clear selection"
                        >
                            <X size={12} />
                        </button>
                    </div>
                )}

                {/* Quick Actions for Selected Text */}
                {lastSelection && (
                    <div className="mb-3 px-1">
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                onClick={() => handleQuickAction('Rewrite this passage with stronger, more evocative prose')}
                                className="text-[10px] px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded-md hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                                title="Improve prose"
                            >
                                <Wand2 size={10} />
                                Improve
                            </button>
                            <button
                                onClick={() => handleQuickAction('Expand this into a fuller scene with more sensory detail')}
                                className="text-[10px] px-2 py-1 bg-blue-500/10 text-blue-600 rounded-md hover:bg-blue-500/20 transition-colors flex items-center gap-1"
                                title="Expand scene"
                            >
                                <StretchVertical size={10} />
                                Expand
                            </button>
                            <button
                                onClick={() => handleQuickAction('Make this more concise without losing meaning')}
                                className="text-[10px] px-2 py-1 bg-amber-500/10 text-amber-600 rounded-md hover:bg-amber-500/20 transition-colors flex items-center gap-1"
                                title="Condense"
                            >
                                <Scissors size={10} />
                                Condense
                            </button>
                            <button
                                onClick={() => handleQuickAction('Rewrite this section with more dialogue')}
                                className="text-[10px] px-2 py-1 bg-purple-500/10 text-purple-600 rounded-md hover:bg-purple-500/20 transition-colors flex items-center gap-1"
                                title="Add dialogue"
                            >
                                <MessageSquare size={10} />
                                Dialogue
                            </button>
                        </div>
                    </div>
                )}

                <div className="relative">
                    <textarea
                        rows={3}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        className="w-full bg-accent/30 border border-border rounded-xl p-3 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none transition-all disabled:opacity-50"
                        placeholder="Ask about your chapter..."
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={!inputValue.trim() || isLoading}
                        className="absolute right-2 bottom-2 p-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        <Send size={14} />
                    </button>
                </div>
                <div className="flex items-center justify-between mt-2 px-1">
                    <div className="flex gap-1 relative">
                        <button
                            onClick={() => setShowProviderMenu(!showProviderMenu)}
                            className="text-[10px] bg-accent/50 hover:bg-accent px-2 py-0.5 rounded transition-colors text-muted-foreground uppercase flex items-center gap-1"
                        >
                            {PROVIDER_LABELS[selectedProvider]}
                            <ChevronDown size={10} />
                        </button>

                        {showProviderMenu && (
                            <div className="absolute bottom-full left-0 mb-1 w-32 bg-card border border-border rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                {(['openrouter', 'openai', 'anthropic'] as AIProvider[]).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => {
                                            setSelectedProvider(p);
                                            setShowProviderMenu(false);
                                        }}
                                        className={`w-full text-left px-3 py-1.5 text-[10px] hover:bg-accent transition-colors ${selectedProvider === p ? 'text-primary font-bold bg-primary/5' : 'text-foreground'}`}
                                    >
                                        {PROVIDER_LABELS[p]}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
