import { X } from 'lucide-react';
import { useState } from 'react';

interface NewProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
        title: string;
        genre?: string;
        audience?: string;
        target_word_count?: number;
    }) => Promise<void>;
}

export function NewProjectModal({ isOpen, onClose, onSubmit }: NewProjectModalProps) {
    const [title, setTitle] = useState('');
    const [genre, setGenre] = useState('');
    const [audience, setAudience] = useState('');
    const [targetWordCount, setTargetWordCount] = useState('80000');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            await onSubmit({
                title,
                genre: genre || undefined,
                audience: audience || undefined,
                target_word_count: parseInt(targetWordCount) || 80000,
            });
            // Reset form only on success
            setTitle('');
            setGenre('');
            setAudience('');
            setTargetWordCount('80000');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create project');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 no-drag p-4 animate-in fade-in duration-300">
            <div className="bg-card w-full max-w-lg p-8 rounded-2xl border border-border animate-in zoom-in-95 duration-500 shadow-2xl relative">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold gradient-text">Create New Project</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-accent rounded-full transition-all duration-300"
                    >
                        <X size={24} className="text-muted-foreground" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
                            {error}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Project Title <span className="text-destructive">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-accent/30 border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            placeholder="My Epic Novel"
                            required
                            autoFocus
                            disabled={isSubmitting}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Genre</label>
                        <input
                            type="text"
                            value={genre}
                            onChange={(e) => setGenre(e.target.value)}
                            className="w-full bg-accent/30 border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            placeholder="Fantasy, Sci-Fi, Romance..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Target Audience</label>
                        <input
                            type="text"
                            value={audience}
                            onChange={(e) => setAudience(e.target.value)}
                            className="w-full bg-accent/30 border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            placeholder="Young Adult, Adult, Middle Grade..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Target Word Count</label>
                        <input
                            type="number"
                            value={targetWordCount}
                            onChange={(e) => setTargetWordCount(e.target.value)}
                            className="w-full bg-accent/30 border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            placeholder="80000"
                            min="1000"
                            step="1000"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2.5 bg-accent hover:bg-accent/80 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {isSubmitting ? 'Creating...' : 'Create Project'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
