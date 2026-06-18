import { X, Check, Moon, Sun, FolderOpen, Feather, ChevronRight, ChevronDown, Sparkles, Lock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from '../../lib/toast';
import type { AIProvider } from '../../types/electron';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DEFAULT_OPENROUTER_MODEL = 'meta-llama/llama-3.3-70b-instruct';

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    // Default to the recommended free path (OpenRouter). Provider switching lives
    // in Advanced settings for power users.
    const [selectedProvider, setSelectedProvider] = useState<AIProvider>('openrouter');
    const [apiKey, setApiKey] = useState('');
    const [hasKey, setHasKey] = useState(false);
    const [encryptionMethod, setEncryptionMethod] = useState<'keychain' | 'base64'>('keychain');
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [openrouterModel, setOpenrouterModel] = useState(DEFAULT_OPENROUTER_MODEL);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadSettings();
            setSaveError(null);
        }
    }, [isOpen, selectedProvider]);

    const loadSettings = async () => {
        try {
            const hasApiKey = await window.electronAPI.hasAPIKey(selectedProvider);
            setHasKey(hasApiKey);

            const method = await window.electronAPI.getEncryptionMethod();
            setEncryptionMethod(method);

            // Load OpenRouter model setting
            if (selectedProvider === 'openrouter') {
                const savedModel = await window.electronAPI.getSetting('openrouterModel');
                setOpenrouterModel(savedModel || DEFAULT_OPENROUTER_MODEL);
            }

            // Load dark mode setting
            const darkMode = await window.electronAPI.getSetting('darkMode');
            setIsDarkMode(darkMode === true);
            if (darkMode === true) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        } catch (err) {
            console.error('Failed to load settings:', err);
            toast.error('Unable to load your settings.');
        }
    };

    const handleSave = async () => {
        if (!apiKey.trim()) return;

        setIsSaving(true);
        setSaveSuccess(false);
        setSaveError(null);

        try {
            await window.electronAPI.setAPIKey(selectedProvider, apiKey);

            // Save OpenRouter model if applicable
            if (selectedProvider === 'openrouter') {
                await window.electronAPI.setSetting('openrouterModel', openrouterModel || DEFAULT_OPENROUTER_MODEL);
            }

            setHasKey(true);
            setSaveSuccess(true);
            setApiKey('');
            toast.success('The Muse is connected.');

            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error('Failed to save API key:', error);
            setSaveError(error instanceof Error ? error.message : 'That key did not work. Please copy it again and retry.');
            toast.error('Could not connect the Muse. Please try again.');
            // Don't clear the input on error - let user try again
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleDarkMode = async () => {
        const newValue = !isDarkMode;
        setIsDarkMode(newValue);
        document.documentElement.classList.toggle('dark', newValue);
        try {
            await window.electronAPI.setSetting('darkMode', newValue);
        } catch (error) {
            console.error('Failed to save theme preference:', error);
            toast.error('Theme changed, but the preference could not be saved.');
        }
    };

    const handleSaveModel = async () => {
        if (selectedProvider !== 'openrouter') return;

        try {
            await window.electronAPI.setSetting('openrouterModel', openrouterModel || DEFAULT_OPENROUTER_MODEL);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error('Failed to save model:', error);
            toast.error('Unable to save the model selection.');
        }
    };

    const handleDelete = async () => {
        try {
            await window.electronAPI.deleteAPIKey(selectedProvider);
            setHasKey(false);
            setApiKey('');
            toast.success('The Muse has been disconnected.');
        } catch (error) {
            console.error('Failed to delete API key:', error);
            toast.error('Unable to disconnect. Please try again.');
        }
    };

    const handleOpenLogs = async () => {
        try {
            await window.electronAPI.openLogsFolder();
        } catch (error) {
            console.error('Failed to open logs folder:', error);
            toast.error('Unable to open the logs folder.');
        }
    };

    if (!isOpen) return null;

    // Where to get a key, by service. The default (OpenRouter) offers a free key.
    const keyUrl = selectedProvider === 'openai'
        ? 'https://platform.openai.com/api-keys'
        : selectedProvider === 'anthropic'
            ? 'https://console.anthropic.com/'
            : 'https://openrouter.ai/keys';
    const getKeyLabel = selectedProvider === 'openrouter' ? 'Get a free key →' : 'Get a key →';

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 no-drag">
            <div className="bg-card w-full max-w-lg p-6 rounded-2xl border border-border max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Settings</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-accent rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* ============ CONNECT THE MUSE (plain-language default) ============ */}
                <div className="p-5 rounded-xl border border-primary/20 bg-primary/5">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Feather size={18} />
                        </div>
                        <h3 className="text-lg font-bold">Connect the Muse</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                        The Muse is your AI writing partner — it can brainstorm ideas, continue a scene, and
                        check your story for plot holes. It uses an online AI service, so it needs a free key
                        to connect. You only do this once, and it takes about a minute.
                    </p>

                    {hasKey ? (
                        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
                                <Check size={16} />
                                <span>The Muse is connected</span>
                            </div>
                            <button
                                onClick={handleDelete}
                                className="text-xs text-muted-foreground hover:text-destructive hover:underline"
                            >
                                Disconnect
                            </button>
                        </div>
                    ) : (
                        <>
                            <label className="block text-sm font-medium mb-2">Your Muse key</label>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => { setApiKey(e.target.value); setSaveError(null); }}
                                className="w-full bg-background border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                placeholder="Paste your key here"
                                autoFocus
                            />
                            <div className="flex items-center justify-between mt-2">
                                <a href={keyUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary hover:underline">
                                    {getKeyLabel}
                                </a>
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                    <Lock size={11} /> Stored only on this computer
                                </span>
                            </div>

                            {saveError && (
                                <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                                    <p className="text-sm text-destructive">{saveError}</p>
                                </div>
                            )}

                            <button
                                onClick={handleSave}
                                disabled={!apiKey.trim() || isSaving}
                                className="w-full mt-3 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSaving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Connecting...
                                    </>
                                ) : saveSuccess ? (
                                    <>
                                        <Sparkles size={16} />
                                        Connected!
                                    </>
                                ) : (
                                    'Connect the Muse'
                                )}
                            </button>
                            <p className="text-[11px] text-muted-foreground text-center mt-2">
                                You can keep writing without the Muse — Bouquine works fully offline.
                            </p>
                        </>
                    )}
                </div>

                {/* ============ APPEARANCE (plain, non-technical) ============ */}
                <div className="mt-4 p-4 bg-accent/30 border border-border/50 rounded-lg flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        {isDarkMode ? <Moon size={18} className="text-primary flex-shrink-0" /> : <Sun size={18} className="text-amber-500 flex-shrink-0" />}
                        <span className="font-medium text-foreground text-sm">{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
                    </div>
                    <button
                        onClick={handleToggleDarkMode}
                        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 overflow-hidden ${isDarkMode ? 'bg-primary' : 'bg-muted'}`}
                    >
                        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${isDarkMode ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>

                {/* Restart the guided tour (kept simple, in the default view) */}
                <button
                    onClick={async () => {
                        try {
                            await window.electronAPI.setSetting('onboarding_complete', false);
                        } catch (error) {
                            console.error('Failed to reset onboarding:', error);
                            toast.error('Unable to restart the tour. Please try again.');
                            return;
                        }
                        window.location.reload();
                    }}
                    className="w-full mt-4 flex items-center gap-3 px-4 py-3 bg-accent/30 hover:bg-accent/50 border border-border/50 rounded-lg transition-colors text-sm text-left group"
                >
                    <Feather size={16} className="text-primary" />
                    <div className="flex-1">
                        <div className="font-medium text-foreground">Replay the welcome tour</div>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
                </button>

                {/* ============ ADVANCED SETTINGS (hidden by default) ============ */}
                <div className="mt-4 border-t pt-4">
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full flex items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <span>Advanced settings</span>
                        <ChevronDown size={16} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                    </button>

                    {showAdvanced && (
                        <div className="mt-4 space-y-6 animate-in fade-in duration-200">
                            <p className="text-xs text-muted-foreground">
                                For experienced users. Most writers never need to change anything here — the default
                                free service works out of the box.
                            </p>

                            {/* AI Provider */}
                            <div>
                                <label className="block text-sm font-medium mb-3">AI provider</label>
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        onClick={() => setSelectedProvider('openrouter')}
                                        className={`p-3 rounded-lg border-2 transition-all ${selectedProvider === 'openrouter' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
                                    >
                                        <div className="font-semibold text-sm">OpenRouter</div>
                                        <div className="text-[11px] text-muted-foreground mt-1">Recommended · free tier</div>
                                    </button>
                                    <button
                                        onClick={() => setSelectedProvider('openai')}
                                        className={`p-3 rounded-lg border-2 transition-all ${selectedProvider === 'openai' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
                                    >
                                        <div className="font-semibold text-sm">OpenAI</div>
                                        <div className="text-[11px] text-muted-foreground mt-1">GPT-4o, GPT-4o mini</div>
                                    </button>
                                    <button
                                        onClick={() => setSelectedProvider('anthropic')}
                                        className={`p-3 rounded-lg border-2 transition-all ${selectedProvider === 'anthropic' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
                                    >
                                        <div className="font-semibold text-sm">Anthropic</div>
                                        <div className="text-[11px] text-muted-foreground mt-1">Claude Sonnet 4.6</div>
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Pick a provider, then paste its key in the “Connect the Muse” box above.
                                    Key page: <a href={keyUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{keyUrl.replace('https://', '')}</a>
                                </p>
                            </div>

                            {/* Model selection (OpenRouter only) */}
                            {selectedProvider === 'openrouter' && (
                                <div>
                                    <label className="block text-sm font-medium mb-2">Model</label>
                                    <input
                                        type="text"
                                        value={openrouterModel}
                                        onChange={(e) => setOpenrouterModel(e.target.value)}
                                        onBlur={handleSaveModel}
                                        className="w-full bg-accent/30 border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm"
                                        placeholder="meta-llama/llama-3.3-70b-instruct"
                                    />
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Recommended: <code className="bg-accent px-1 rounded text-primary">meta-llama/llama-3.3-70b-instruct</code> (reliable, ~$0.10 per 1M tokens)
                                        <br />
                                        Also good: <code className="bg-accent px-1 rounded">google/gemini-2.5-flash</code> · <code className="bg-accent px-1 rounded">openai/gpt-4o-mini</code>
                                        <br />
                                        Free option: <code className="bg-accent px-1 rounded">meta-llama/llama-3.3-70b-instruct:free</code> (often rate-limited; a tiny amount of credit is far more reliable)
                                    </p>
                                </div>
                            )}

                            {/* Secure storage detail */}
                            <div className="text-xs text-muted-foreground">
                                {encryptionMethod === 'keychain'
                                    ? 'Keys are encrypted with your system keychain (macOS Keychain, Windows Credential Manager, or Linux Secret Service).'
                                    : '⚠️ System keychain unavailable. Keys are stored with base64 encoding on this computer.'}
                            </div>

                            {/* Troubleshooting */}
                            <button
                                onClick={handleOpenLogs}
                                className="w-full flex items-center gap-3 px-4 py-3 bg-accent/30 hover:bg-accent/50 border border-border rounded-lg transition-colors text-sm"
                            >
                                <FolderOpen size={16} />
                                <div className="text-left flex-1">
                                    <div className="font-medium">Open debug logs</div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                        Technical error codes only — never your manuscript. Attach when reporting a bug.
                                    </div>
                                </div>
                            </button>
                        </div>
                    )}
                </div>

                {/* Close */}
                <div className="pt-5 mt-4 border-t">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2.5 bg-accent hover:bg-accent/80 rounded-lg font-medium transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
