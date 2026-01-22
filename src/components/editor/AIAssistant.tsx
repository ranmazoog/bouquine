import { Send, Feather, Sparkles, User, Bot, Trash2, FileText, Loader2, ChevronDown, ArrowLeft, Copy, Check, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useProjectStore, useEditorStore } from '../../stores/projectStore';
import type { AIProvider } from '../../types/electron';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

const PROVIDER_LABELS: Record<AIProvider, string> = {
    openai: 'GPT-4',
    anthropic: 'Claude',
    openrouter: 'OpenRouter',
};

const MAX_PREVIEW_LENGTH = 400;

export function AIAssistant() {
    const { currentProject, updateChapterInStore } = useProjectStore();
    const { currentChapter, setCurrentChapter, triggerInsert, lastSelection, setSelection, activeBeat, setActiveBeat } = useEditorStore();
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

    useEffect(() => {
        if (activeBeat && currentChapter) {
            const prompt = `I'm ready to write this chapter. Here is the outline:\n\n${activeBeat}\n\nWrite the opening scene.`;
            setMessages(prev => [...prev, { role: 'user', content: prompt }]);
            setActiveBeat(null);
        }
    }, [activeBeat, currentChapter, setActiveBeat]);

    const handleSend = async () => {
        if (!inputValue.trim() || !currentProject || !currentChapter || isLoading) return;

        const userMsg = inputValue;
        const selectedContext = lastSelection?.text || null; // Capture current selection

        setInputValue('');
        setIsLoading(true);

        // 1. Add User Message (show selection context if present)
        const displayMsg = selectedContext
            ? `[Re: "${selectedContext.substring(0, 50)}${selectedContext.length > 50 ? '...' : ''}"]\n\n${userMsg}`
            : userMsg;
        setMessages(prev => [...prev, { role: 'user', content: displayMsg }]);

        // 2. Add Placeholder Assistant Message
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

        try {
            // 3. Trigger Backend with selected text context
            await window.electronAPI.aiChatMessage({
                projectId: currentProject.id,
                chapterId: currentChapter.id,
                message: userMsg,
                provider: selectedProvider,
                selectedText: selectedContext
            });

        } catch (err) {
            console.error('AI Chat Error:', err);
            setMessages(prev => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: 'Error: Could not connect to AI. Please check your API settings.' }
            ]);
        } finally {
            setIsLoading(false);
        }
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
            {/* Rebranded Header */}
            <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Feather size={18} className="text-primary" />
                    <h3 className="font-semibold text-sm">The Muse</h3>
                </div>
                <button onClick={handleClear} className="text-muted-foreground hover:text-destructive transition-colors" title="Clear Chat">
                    <Trash2 size={14} />
                </button>
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
                                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                            </div>

                            {/* Message Bubble */}
                            <div className={`
                            relative rounded-2xl p-3 text-sm max-w-[85%] whitespace-pre-wrap leading-relaxed shadow-sm flex flex-col
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
                        <p className="text-xs text-muted-foreground font-medium mb-1 mt-2">Try asking:</p>
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
                        onClick={handleSend}
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
                            <div className="absolute bottom-full left-0 mb-1 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[120px] z-10">
                                {(Object.keys(PROVIDER_LABELS) as AIProvider[]).map((provider) => (
                                    <button
                                        key={provider}
                                        onClick={() => {
                                            setSelectedProvider(provider);
                                            setShowProviderMenu(false);
                                        }}
                                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors ${selectedProvider === provider ? 'text-primary font-medium' : 'text-muted-foreground'
                                            }`}
                                    >
                                        {PROVIDER_LABELS[provider]}
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
