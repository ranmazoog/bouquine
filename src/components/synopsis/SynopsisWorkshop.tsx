import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Sparkles, RefreshCw, Loader2, Check } from 'lucide-react';
import { WORKSHOP_STEPS } from './workshopSteps';

interface SynopsisWorkshopProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (synopsis: string) => void;
}

export function SynopsisWorkshop({ isOpen, onClose, onComplete }: SynopsisWorkshopProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [generatedSynopsis, setGeneratedSynopsis] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [showConfirmClose, setShowConfirmClose] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const step = WORKSHOP_STEPS[currentStep];
    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === WORKSHOP_STEPS.length - 1;
    const showPreview = currentStep >= 2;

    useEffect(() => {
        if (isOpen && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [isOpen, currentStep]);

    // Generate synopsis preview when entering a step >= 2
    useEffect(() => {
        if (isOpen && currentStep >= 2 && Object.keys(answers).length >= 2) {
            generatePartialSynopsis(answers);
        }
    }, [isOpen, currentStep]);

    const handleAnswerChange = (value: string) => {
        setAnswers(prev => ({ ...prev, [step.id]: value }));
    };

    const generatePartialSynopsis = async (currentAnswers: Record<string, string>) => {
        const filledAnswers = Object.entries(currentAnswers)
            .filter(([, value]) => value.trim())
            .reduce<Record<string, string>>((acc, [key, value]) => ({ ...acc, [key]: value }), {});

        if (Object.keys(filledAnswers).length < 2) return;

        setIsGenerating(true);
        try {
            const prompt = `Based on the following story elements, write a brief synopsis section (2-3 sentences):

${Object.entries(filledAnswers).map(([key, value]) => {
    const label = key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ');
    return `${label}: ${value}`;
}).join('\n')}

Continue building toward the full story.`;

            const response = await window.electronAPI.aiGenerate('openrouter', [
                { role: 'system', content: 'You are a professional book editor helping craft a compelling story synopsis.' },
                { role: 'user', content: prompt }
            ]);

            setGeneratedSynopsis(response);
        } catch (error: any) {
            console.error('Failed to generate partial synopsis:', error);
            if (error?.message?.includes('429') || error?.message?.includes('rate limit')) {
                setGeneratedSynopsis('[Rate limit reached. You can still write your synopsis manually, or add credits to OpenRouter to continue using AI features.]');
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleNext = async () => {
        const newAnswers = { ...answers, [step.id]: answers[step.id] || '' };
        setAnswers(newAnswers);

        if (currentStep >= 2) {
            await generatePartialSynopsis(newAnswers);
        }

        if (isLastStep) {
            handleComplete(newAnswers);
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleSkip = () => {
        setAnswers(prev => ({ ...prev, [step.id]: '' }));
        handleNext();
    };

    const handleRegenerate = async (currentAnswers?: Record<string, string>) => {
        const answersToUse = currentAnswers || answers;
        const filledAnswers = Object.entries(answersToUse)
            .filter(([, value]) => value.trim())
            .reduce<Record<string, string>>((acc, [key, value]) => ({ ...acc, [key]: value }), {});

        if (Object.keys(filledAnswers).length < 5) return;

        setIsRegenerating(true);
        try {
            const prompt = `You are a professional book editor. Write a compelling synopsis (150-250 words) based on:

Hook: ${filledAnswers.hook || '[not provided]'}
Ending: ${filledAnswers.ending || '[not provided]'}
Central Conflict: ${filledAnswers.conflict || '[not provided]'}
Want vs Need: ${filledAnswers.want_need || '[not provided]'}
Tone: ${filledAnswers.tone || '[not provided]'}

Requirements:
- Hook the reader immediately
- Establish protagonist and situation
- Present conflict clearly
- Match the specified tone
- Do NOT include preamble — just the synopsis text
- 150-250 words`;

            const response = await window.electronAPI.aiGenerate('openrouter', [
                { role: 'system', content: 'You are a professional book editor.' },
                { role: 'user', content: prompt }
            ]);

            setGeneratedSynopsis(response);
        } catch (error: any) {
            console.error('Failed to regenerate synopsis:', error);
            if (error?.message?.includes('429') || error?.message?.includes('rate limit')) {
                setGeneratedSynopsis('[Rate limit reached. You can still write your synopsis manually, or add credits to OpenRouter to continue using AI features.]');
            }
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleComplete = async (finalAnswers?: Record<string, string>) => {
        if (!generatedSynopsis.trim()) {
            await handleRegenerate(finalAnswers || answers);
        }
        if (generatedSynopsis.trim()) {
            onComplete(generatedSynopsis);
        }
    };

    const handleClose = () => {
        const hasAnswers = Object.values(answers).some(a => a.trim());
        if (hasAnswers && !isLastStep) {
            setShowConfirmClose(true);
        } else {
            onClose();
        }
    };

    const confirmClose = () => {
        onClose();
        setShowConfirmClose(false);
        setCurrentStep(0);
        setAnswers({});
        setGeneratedSynopsis('');
    };

    const progressPercent = ((currentStep + 1) / WORKSHOP_STEPS.length) * 100;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

            {/* Modal */}
            <div className="relative bg-card w-full max-w-2xl mx-4 rounded-2xl shadow-2xl border border-border max-h-[85vh] flex flex-col animate-in fade-in-0 zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                    <div className="flex items-center gap-2">
                        <Sparkles size={18} className="text-primary" />
                        <h2 className="font-semibold">Synopsis Workshop</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1.5 hover:bg-accent rounded-full transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="h-1 bg-muted">
                    <div
                        className="h-full bg-primary transition-all duration-300 ease-out"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                {/* Progress Steps */}
                <div className="px-6 py-3 border-b border-border/30">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {WORKSHOP_STEPS.map((s, index) => (
                                <div
                                    key={s.id}
                                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                                        index < currentStep
                                            ? 'bg-primary'
                                            : index === currentStep
                                            ? 'bg-primary ring-2 ring-primary/30'
                                            : 'bg-muted'
                                    }`}
                                />
                            ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                            Step {currentStep + 1} of {WORKSHOP_STEPS.length}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-6">
                        {/* Question */}
                        <div className="mb-6">
                            <h3 className="text-xl font-semibold mb-2">{step.question}</h3>
                            <p className="text-muted-foreground text-sm">{step.description}</p>

                            {/* Examples */}
                            {step.examples.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {step.examples.map((example, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleAnswerChange(example)}
                                            className="text-xs px-3 py-1.5 bg-accent/50 hover:bg-accent rounded-full text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            "{example.substring(0, 50)}..."
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Textarea */}
                        <div className="mb-6">
                            <textarea
                                ref={textareaRef}
                                value={answers[step.id] || ''}
                                onChange={(e) => handleAnswerChange(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleNext();
                                    }
                                    if (e.key === 'Escape') {
                                        handleClose();
                                    }
                                }}
                                className="w-full h-32 bg-background border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                placeholder={step.placeholder}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Press <kbd className="px-1.5 py-0.5 bg-accent rounded text-[10px]">Enter</kbd> to continue
                            </p>
                        </div>

                        {/* Synopsis Preview */}
                        {showPreview && (
                            <div className="border-t border-border/50 pt-6">
                                <div className="flex items-center gap-2 mb-3">
                                    {isGenerating ? (
                                        <Loader2 size={14} className="text-primary animate-spin" />
                                    ) : (
                                        <Sparkles size={14} className="text-muted-foreground" />
                                    )}
                                    <span className="text-sm font-medium text-muted-foreground">
                                        {isLastStep ? 'YOUR SYNOPSIS' : 'SYNOPSIS PREVIEW'}
                                    </span>
                                </div>

                                {isGenerating ? (
                                    <div className="bg-accent/30 rounded-lg p-4 text-sm text-muted-foreground animate-pulse">
                                        Generating preview...
                                    </div>
                                ) : (
                                    <div className="bg-accent/30 rounded-lg p-4 text-sm font-serif leading-relaxed whitespace-pre-wrap text-foreground">
                                        {generatedSynopsis || (
                                            <span className="text-muted-foreground italic">
                                                Keep answering questions to see your synopsis take shape...
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border/50 bg-background/50 flex items-center justify-between">
                    <div>
                        {!isFirstStep && (
                            <button
                                onClick={handleBack}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ChevronLeft size={16} />
                                Back
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {!isLastStep && (
                            <button
                                onClick={handleSkip}
                                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Skip
                            </button>
                        )}

                        {isLastStep ? (
                            <>
                                <button
                                    onClick={() => handleRegenerate(answers)}
                                    disabled={isRegenerating}
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                                >
                                    {isRegenerating ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <RefreshCw size={16} />
                                    )}
                                    Regenerate
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!generatedSynopsis.trim()) {
                                            await handleRegenerate(answers);
                                        }
                                        if (generatedSynopsis.trim()) {
                                            onComplete(generatedSynopsis);
                                            onClose();
                                        }
                                    }}
                                    className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                                >
                                    <Check size={16} />
                                    Use This Synopsis
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={handleNext}
                                className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                            >
                                Next
                                <ChevronRight size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Confirm Close Dialog */}
            {showConfirmClose && (
                <div className="absolute inset-0 z-60 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative bg-card rounded-xl shadow-2xl p-6 max-w-md mx-4 border border-border animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-semibold mb-2">Discard progress?</h3>
                        <p className="text-muted-foreground text-sm mb-6">
                            You've answered some questions. Are you sure you want to close the workshop?
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowConfirmClose(false)}
                                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Keep Working
                            </button>
                            <button
                                onClick={confirmClose}
                                className="px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                            >
                                Discard & Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
