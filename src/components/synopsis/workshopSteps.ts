export interface WorkshopStep {
    id: string;
    question: string;
    description: string;
    examples: string[];
    placeholder: string;
}

export const WORKSHOP_STEPS: WorkshopStep[] = [
    {
        id: 'protagonist',
        question: "Who is the Protagonist?",
        description: "Describe your main character's background and core identity.",
        examples: [
            "A reluctant hero with a secret past.",
            "A cunning detective who has lost their faith in the system.",
            "A young orphan who discovers they have forbidden powers."
        ],
        placeholder: "e.g., A reluctant hero, a cunning detective..."
    },
    {
        id: 'goal',
        question: "What do they want?",
        description: "What is their primary objective or driving desire?",
        examples: [
            "To save their village from an ancient curse.",
            "To solve the murder of their former partner.",
            "To find a place where they truly belong."
        ],
        placeholder: "e.g., To save their village, to solve the murder..."
    },
    {
        id: 'conflict',
        question: "What stands in their way?",
        description: "What key obstacles or enemies are preventing them from reaching their goal?",
        examples: [
            "A powerful enemy who controls the elements.",
            "Their own fears and the secrets of their past.",
            "A corrupt organization with infinite resources."
        ],
        placeholder: "e.g., A powerful enemy, their own fears..."
    },
    {
        id: 'ending',
        question: "How does it end?",
        description: "Describe the resolution of the story. Who wins? Who loses?",
        examples: [
            "They defeat the enemy but at a heavy personal cost.",
            "They solve the mystery, only to realize the truth is darker than they imagined.",
            "Victory but with a bittersweet resolution that changes them forever."
        ],
        placeholder: "e.g., Victory but at a cost, a bittersweet resolution..."
    }
];
