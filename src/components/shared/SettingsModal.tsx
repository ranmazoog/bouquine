import { X, Key, Shield, Check, Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { AIProvider } from '../../types/electron';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DEFAULT_OPENROUTER_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [selectedProvider, setSelectedProvider] = useState<AIProvider>('openai');
    const [apiKey, setApiKey] = useState('');
    const [hasKey, setHasKey] = useState(false);
    const [encryptionMethod, setEncryptionMethod] = useState<'keychain' | 'base64'>('keychain');
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [openrouterModel, setOpenrouterModel] = useState(DEFAULT_OPENROUTER_MODEL);
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadSettings();
        }
    }, [isOpen, selectedProvider]);

    const loadSettings = async () => {
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
    };

    const handleSave = async () => {
        if (!apiKey.trim()) return;

        setIsSaving(true);
        setSaveSuccess(false);

        try {
            await window.electronAPI.setAPIKey(selectedProvider, apiKey);

            // Save OpenRouter model if applicable
            if (selectedProvider === 'openrouter') {
                await window.electronAPI.setSetting('openrouterModel', openrouterModel || DEFAULT_OPENROUTER_MODEL);
            }

            setHasKey(true);
            setSaveSuccess(true);
            setApiKey('');

            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error('Failed to save API key:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleDarkMode = async () => {
        const newValue = !isDarkMode;
        setIsDarkMode(newValue);
        document.documentElement.classList.toggle('dark', newValue);
        await window.electronAPI.setSetting('darkMode', newValue);
    };

    const handleSaveModel = async () => {
        if (selectedProvider !== 'openrouter') return;

        try {
            await window.electronAPI.setSetting('openrouterModel', openrouterModel || DEFAULT_OPENROUTER_MODEL);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error('Failed to save model:', error);
        }
    };

    const handleDelete = async () => {
        try {
            await window.electronAPI.deleteAPIKey(selectedProvider);
            setHasKey(false);
            setApiKey('');
        } catch (error) {
            console.error('Failed to delete API key:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 no-drag">
            <div className="bg-card w-full max-w-2xl p-6 rounded-2xl border border-border max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Settings</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-accent rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Security Notice */}
                <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-start gap-3">
                    <Shield size={20} className="text-primary mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                        <p className="font-medium text-primary mb-1">Secure Storage</p>
                        <p className="text-muted-foreground">
                            {encryptionMethod === 'keychain' ? (
                                <>Your API keys are encrypted using your system's keychain (macOS Keychain, Windows Credential Manager, or Linux Secret Service).</>
                            ) : (
                                <>⚠️ System keychain unavailable. Keys are stored with base64 encoding. Consider using environment variables for production.</>
                            )}
                        </p>
                    </div>
                </div>

                {/* Theme Toggle */}
                <div className="mb-6 p-4 bg-accent/30 border border-border/50 rounded-lg">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            {isDarkMode ? (
                                <Moon size={20} className="text-primary flex-shrink-0" />
                            ) : (
                                <Sun size={20} className="text-amber-500 flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                                <p className="font-medium text-foreground truncate">{isDarkMode ? 'Dark Mode' : 'Light Mode'}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                    {isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleToggleDarkMode}
                            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 overflow-hidden ${isDarkMode ? 'bg-primary' : 'bg-muted'
                                }`}
                        >
                            <span
                                className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${isDarkMode ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                            />
                        </button>
                    </div>
                </div>

                {/* AI Provider Selection */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-3">AI Provider</label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => setSelectedProvider('openai')}
                                className={`p-4 rounded-lg border-2 transition-all ${selectedProvider === 'openai'
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border hover:border-primary/50'
                                    }`}
                            >
                                <div className="font-semibold">OpenAI</div>
                                <div className="text-xs text-muted-foreground mt-1">GPT-4, GPT-3.5</div>
                            </button>
                            <button
                                onClick={() => setSelectedProvider('anthropic')}
                                className={`p-4 rounded-lg border-2 transition-all ${selectedProvider === 'anthropic'
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border hover:border-primary/50'
                                    }`}
                            >
                                <div className="font-semibold">Anthropic</div>
                                <div className="text-xs text-muted-foreground mt-1">Claude 3.5 Sonnet</div>
                            </button>
                            <button
                                onClick={() => setSelectedProvider('openrouter')}
                                className={`p-4 rounded-lg border-2 transition-all ${selectedProvider === 'openrouter'
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border hover:border-primary/50'
                                    }`}
                            >
                                <div className="font-semibold">OpenRouter</div>
                                <div className="text-xs text-muted-foreground mt-1">100+ models, free tier</div>
                            </button>
                        </div>
                    </div>

                    {/* API Key Input */}
                    <div>
                        <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                            <Key size={16} />
                            API Key for {selectedProvider === 'openai' ? 'OpenAI' : selectedProvider === 'anthropic' ? 'Anthropic' : 'OpenRouter'}
                        </label>

                        {hasKey && (
                            <div className="mb-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                                    <Check size={16} />
                                    <span>API key is configured</span>
                                </div>
                                <button
                                    onClick={handleDelete}
                                    className="text-xs text-destructive hover:underline"
                                >
                                    Remove
                                </button>
                            </div>
                        )}

                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="w-full bg-accent/30 border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm"
                            placeholder={hasKey ? "Enter new key to update..." : selectedProvider === 'openrouter' ? "sk-or-..." : "sk-..."}
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                            {selectedProvider === 'openai' ? (
                                <>Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenAI Platform</a></>
                            ) : selectedProvider === 'anthropic' ? (
                                <>Get your API key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Anthropic Console</a></>
                            ) : (
                                <>Get your free API key from <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenRouter</a></>
                            )}
                        </p>
                    </div>

                    {/* OpenRouter Model Selection */}
                    {selectedProvider === 'openrouter' && (
                        <div>
                            <label className="block text-sm font-medium mb-2">Model ID</label>
                            <input
                                type="text"
                                value={openrouterModel}
                                onChange={(e) => setOpenrouterModel(e.target.value)}
                                onBlur={handleSaveModel}
                                className="w-full bg-accent/30 border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm"
                                placeholder="meta-llama/llama-3.3-70b-instruct:free"
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                                Free models: <code className="bg-accent px-1 rounded">meta-llama/llama-3.3-70b-instruct:free</code>
                                <br />
                                Gemini: <code className="bg-accent px-1 rounded">google/gemini-2.0-flash-001</code>
                                <br />
                                DeepSeek: <code className="bg-accent px-1 rounded">deepseek/deepseek-chat:free</code>
                            </p>
                        </div>
                    )}

                    {/* Save Button */}
                    <div className="flex gap-3 pt-4 border-t">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-accent hover:bg-accent/80 rounded-lg font-medium transition-colors"
                        >
                            Close
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!apiKey.trim() || isSaving}
                            className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : saveSuccess ? (
                                <>
                                    <Check size={16} />
                                    Saved!
                                </>
                            ) : (
                                'Save API Key'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
