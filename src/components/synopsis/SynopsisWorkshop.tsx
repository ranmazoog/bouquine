import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Sparkles, RefreshCw, Loader2, Check, AlertTriangle } from 'lucide-react';
import { WORKSHOP_STEPS } from './workshopSteps';
import { motion, AnimatePresence } from 'framer-motion';

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
    const [showConfirmClose, setShowConfirmClose] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const step = WORKSHOP_STEPS[currentStep];
    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === WORKSHOP_STEPS.length - 1;

    useEffect(() => {
        if (isOpen && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [isOpen, currentStep]);

    const handleAnswerChange = (value: string) => {
        setAnswers(prev => ({ ...prev, [step.id]: value }));
        if (error) setError(null);
    };

    const handleGenerate = async () => {
        const filledChoices = {
            protagonist: answers['protagonist'] || '',
            goal: answers['goal'] || '',
            conflict: answers['conflict'] || '',
            ending: answers['ending'] || ''
        };

        setIsGenerating(true);
        setError(null);
        try {
            const response = await window.electronAPI.generateSynopsisFromInputs(filledChoices);
            setGeneratedSynopsis(response);
        } catch (err: any) {
            console.error('Failed to generate synopsis:', err);
            setError(err.message || 'Failed to generate synopsis. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleNext = async () => {
        if (isLastStep) {
            await handleGenerate();
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleClose = () => {
        const hasAnswers = Object.values(answers).some(a => a.trim());
        if (hasAnswers && !generatedSynopsis) {
            setShowConfirmClose(true);
        } else {
            confirmClose();
        }
    };

    const confirmClose = () => {
        onClose();
        setShowConfirmClose(false);
        setTimeout(() => {
            setCurrentStep(0);
            setAnswers({});
            setGeneratedSynopsis('');
            setError(null);
        }, 300);
    };

    const progressPercent = ((currentStep + 1) / WORKSHOP_STEPS.length) * 100;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={handleClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative bg-card w-full max-w-2xl mx-4 rounded-2xl shadow-2xl border border-border max-h-[90vh] flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border/50 bg-accent/5">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Sparkles size={18} className="text-primary" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-base leading-none">Synopsis Workshop</h2>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Guided Brainstorming</p>
                                </div>
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
                            <motion.div
                                className="h-full bg-primary"
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                            />
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-8">
                                <AnimatePresence mode="wait">
                                    {generatedSynopsis ? (
                                        <motion.div
                                            key="result"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.5 }}
                                            className="space-y-6"
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 shadow-sm border border-green-500/20">
                                                    <Check size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold">Concept Crafted!</h3>
                                                    <p className="text-muted-foreground text-sm">Your raw ideas have been woven into a narrative arc.</p>
                                                </div>
                                            </div>

                                            <div className="bg-accent/30 rounded-xl p-6 border border-border/50 relative group shadow-inner">
                                                <div className="absolute -top-3 left-6 px-3 py-1 bg-background border border-border rounded-full text-[10px] font-bold uppercase tracking-wider text-muted-foreground shadow-sm">
                                                    Narrative Result
                                                </div>
                                                <div className="text-lg font-serif leading-relaxed text-foreground whitespace-pre-wrap max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                                    {generatedSynopsis}
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-3">
                                                <button
                                                    onClick={() => {
                                                        onComplete(generatedSynopsis);
                                                        confirmClose();
                                                    }}
                                                    className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                                                >
                                                    <Check size={18} />
                                                    Accept and Use Synopsis
                                                </button>
                                                <button
                                                    onClick={handleGenerate}
                                                    disabled={isGenerating}
                                                    className="w-full py-3 bg-accent hover:bg-accent/80 text-foreground rounded-xl font-semibold transition-all flex items-center justify-center gap-2 border border-border/50 active:scale-95"
                                                >
                                                    <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
                                                    Regenerate Version
                                                </button>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key={currentStep}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-6"
                                        >
                                            {/* Question Section */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shadow-sm shadow-primary/20">
                                                        {currentStep + 1}
                                                    </span>
                                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                                        Step {currentStep + 1} of {WORKSHOP_STEPS.length}
                                                    </span>
                                                </div>
                                                <h3 className="text-2xl font-serif font-bold mb-2 leading-tight">{step.question}</h3>
                                                <p className="text-muted-foreground text-sm max-w-md">{step.description}</p>
                                            </div>

                                            {/* Input Area */}
                                            <div className="space-y-4">
                                                <div className="relative">
                                                    <textarea
                                                        ref={textareaRef}
                                                        value={answers[step.id] || ''}
                                                        onChange={(e) => handleAnswerChange(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && !e.shiftKey && (answers[step.id]?.trim())) {
                                                                e.preventDefault();
                                                                handleNext();
                                                            }
                                                        }}
                                                        className="w-full h-40 bg-background border border-border rounded-xl px-5 py-4 text-base focus:outline-none focus:ring-4 focus:ring-primary/10 resize-none transition-all placeholder:text-muted-foreground/30 font-serif shadow-inner"
                                                        placeholder={step.placeholder}
                                                    />
                                                    {!answers[step.id]?.trim() && (
                                                        <div className="absolute bottom-4 right-4 flex items-center gap-2 text-[10px] text-muted-foreground/40 italic pointer-events-none">
                                                            <span>Write something to continue</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Examples */}
                                                {step.examples.length > 0 && (
                                                    <div className="space-y-2">
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 opacity-70">Example Inspirations</p>
                                                        <div className="grid grid-cols-1 gap-2">
                                                            {step.examples.map((example, i) => (
                                                                <button
                                                                    key={i}
                                                                    onClick={() => handleAnswerChange(example)}
                                                                    className="text-left text-xs px-4 py-3 bg-accent/20 hover:bg-accent hover:border-border/50 border border-transparent rounded-xl text-muted-foreground hover:text-foreground transition-all flex items-center gap-2 group"
                                                                >
                                                                    <Sparkles size={10} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                    <span className="flex-1 opacity-80 group-hover:opacity-100">"{example}"</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {error && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3 text-destructive"
                                                >
                                                    <AlertTriangle size={18} />
                                                    <p className="text-sm font-medium">{error}</p>
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Footer */}
                        {!generatedSynopsis && (
                            <div className="p-4 border-t border-border/50 bg-background/50 flex items-center justify-between">
                                <div>
                                    {!isFirstStep && (
                                        <button
                                            onClick={handleBack}
                                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
                                        >
                                            <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                                            Back
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] text-muted-foreground/50 mr-2 border-r border-border/50 pr-4 hidden sm:inline-block">
                                        <kbd className="px-1.5 py-0.5 bg-accent rounded border border-border/50 font-sans shadow-sm">Enter</kbd> to proceed
                                    </span>
                                    <button
                                        onClick={handleNext}
                                        disabled={!answers[step.id]?.trim() || isGenerating}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:grayscale shadow-md shadow-primary/20 active:scale-95"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                Crafting...
                                            </>
                                        ) : isLastStep ? (
                                            <>
                                                Generate
                                                <Sparkles size={16} />
                                            </>
                                        ) : (
                                            <>
                                                Next Stage
                                                <ChevronRight size={16} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* Confirm Close Dialog */}
                    <AnimatePresence>
                        {showConfirmClose && (
                            <div className="absolute inset-0 z-[110] flex items-center justify-center">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="relative bg-card rounded-2xl shadow-2xl p-6 max-w-md mx-4 border border-border"
                                >
                                    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-4 border border-destructive/20 shadow-sm">
                                        <AlertTriangle size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">Discard progress?</h3>
                                    <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                                        You've answered some questions but haven't generated your synopsis yet. All progress for this session will be lost.
                                    </p>
                                    <div className="flex gap-3 justify-end">
                                        <button
                                            onClick={() => setShowConfirmClose(false)}
                                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            Keep Working
                                        </button>
                                        <button
                                            onClick={confirmClose}
                                            className="px-6 py-2 text-sm bg-destructive text-destructive-foreground rounded-xl font-bold hover:bg-destructive/90 transition-all shadow-md shadow-destructive/10 active:scale-95"
                                        >
                                            Discard
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </AnimatePresence>
    );
}
