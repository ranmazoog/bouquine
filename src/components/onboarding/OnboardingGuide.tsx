import { useState, useEffect } from 'react';
import { Brain, Map, Sparkles, X, ChevronRight, ChevronLeft } from 'lucide-react';

interface OnboardingStep {
    id: number;
    title: string;
    body: string;
    icon: React.ReactNode;
}

const STEPS: OnboardingStep[] = [
    {
        id: 1,
        title: 'Bouquine\'s Memory',
        body: 'Our AI needs a Series Bible. Add your Characters, World Elements, and Style Rules now. Anything here is automatically indexed for perfect recall in any chapter.',
        icon: <Brain size={32} className="text-purple-400" />,
    },
    {
        id: 2,
        title: 'Set the North Star',
        body: 'Use the Synopsis tab to write your full plot summary (spoilers included). This gives the AI "Foresight" to properly foreshadow events and avoid plot holes.',
        icon: <Map size={32} className="text-amber-400" />,
    },
    {
        id: 3,
        title: 'Outline in Seconds',
        body: 'Go to the Corkboard view and click "Generate Beat." Bouquine will suggest the next plot point based on your Synopsis. Click "Write Prose" to draft the scene instantly.',
        icon: <Sparkles size={32} className="text-emerald-400" />,
    },
];

export function OnboardingGuide() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        const checkOnboardingStatus = async () => {
            try {
                const onboardingComplete = await window.electronAPI.getSetting('onboarding_complete');
                if (onboardingComplete !== true) {
                    setIsVisible(true);
                }
            } catch (error) {
                console.error('Failed to check onboarding status:', error);
                setIsVisible(true);
            }
        };

        checkOnboardingStatus();
    }, []);

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleComplete = async () => {
        setIsAnimating(true);
        try {
            await window.electronAPI.setSetting('onboarding_complete', true);
            setTimeout(() => {
                setIsVisible(false);
            }, 300);
        } catch (error) {
            console.error('Failed to save onboarding status:', error);
        }
    };

    const handleSkip = async () => {
        setIsAnimating(true);
        try {
            await window.electronAPI.setSetting('onboarding_complete', true);
            setTimeout(() => {
                setIsVisible(false);
            }, 300);
        } catch (error) {
            console.error('Failed to save onboarding status:', error);
        }
    };

    if (!isVisible) return null;

    const step = STEPS[currentStep];
    const progress = ((currentStep + 1) / STEPS.length) * 100;

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
            <div className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Sparkles size={16} className="text-primary" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">Bouquine Tour</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                            {STEPS.map((_, index) => (
                                <div
                                    key={index}
                                    className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                                        index === currentStep ? 'bg-primary' : 'bg-muted'
                                    }`}
                                />
                            ))}
                        </div>
                        <button
                            onClick={handleSkip}
                            className="ml-4 p-1 hover:bg-accent rounded-full transition-colors"
                            title="Skip tour"
                        >
                            <X size={18} className="text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-1 bg-muted">
                    <div
                        className="h-full bg-primary transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Content */}
                <div className="p-8">
                    <div className="flex flex-col items-center text-center">
                        <div className="mb-6 p-4 rounded-2xl bg-accent/30">
                            {step.icon}
                        </div>
                        <h2 className="text-2xl font-bold mb-3 text-foreground">{step.title}</h2>
                        <p className="text-muted-foreground leading-relaxed mb-6">{step.body}</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t border-border/50 bg-accent/10">
                    <button
                        onClick={handlePrev}
                        disabled={currentStep === 0}
                        className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            currentStep === 0
                                ? 'text-muted-foreground/50 cursor-not-allowed'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                    >
                        <ChevronLeft size={16} />
                        Back
                    </button>

                    {currentStep === STEPS.length - 1 ? (
                        <button
                            onClick={handleComplete}
                            className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                        >
                            Let&apos;s Write!
                            <Sparkles size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            className="flex items-center gap-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                            Next
                            <ChevronRight size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
