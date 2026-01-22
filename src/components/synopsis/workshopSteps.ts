export interface WorkshopStep {
    id: string;
    question: string;
    description: string;
    examples: string[];
    placeholder: string;
}

export const WORKSHOP_STEPS: WorkshopStep[] = [
    {
        id: 'hook',
        question: "What's the hook?",
        description: "Describe your story in one compelling sentence.",
        examples: [
            "A janitor discovers he can pause time, but each second frozen costs a day of his life.",
            "Two rival chefs fall in love while competing for the same Michelin star."
        ],
        placeholder: "A [protagonist] must [action] or else [stakes]..."
    },
    {
        id: 'ending',
        question: "How does it end?",
        description: "Spoilers welcome — this helps the AI foreshadow. Who wins? Who loses?",
        examples: [
            "She catches the killer but loses her partner.",
            "He saves the kingdom but gives up his magic forever."
        ],
        placeholder: "In the end..."
    },
    {
        id: 'conflict',
        question: "What's the central conflict?",
        description: "What obstacle or opposition drives your story?",
        examples: [
            "She must find the cure before the outbreak spreads.",
            "He's torn between duty to his country and love for his family."
        ],
        placeholder: "The main tension is..."
    },
    {
        id: 'want_need',
        question: "What does your protagonist want vs. need?",
        description: "External goal vs. internal growth — often in tension.",
        examples: [
            "Want: Revenge. Need: Forgiveness.",
            "Want: To win. Need: To accept that losing isn't failure."
        ],
        placeholder: "They want... but they need..."
    },
    {
        id: 'tone',
        question: "What's the tone?",
        description: "How should this story feel?",
        examples: [
            "Dark, gritty, with gallows humor",
            "Warm and hopeful, like a Pixar film for adults",
            "Tense and claustrophobic — psychological thriller"
        ],
        placeholder: "The tone is..."
    }
];
