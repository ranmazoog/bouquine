# Agent Guidelines for Sonic Belt

Sonic Belt is a React + TypeScript + Electron application for AI-assisted novel writing. This document provides essential information for agentic coding assistants working in this repository.

## Project Overview

- **Framework**: React 19 + TypeScript + Vite
- **Desktop**: Electron application
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Testing**: Vitest with jsdom
- **Database**: SQLite with better-sqlite3
- **AI Integration**: OpenAI, Anthropic, OpenRouter providers

## Build, Lint, and Test Commands

### Development
```bash
npm run dev          # Start Vite dev server
npm run electron     # Start Electron app (requires built files)
npm start            # Build and start Electron app
```

### Build & Lint
```bash
npm run build        # TypeScript compilation + Vite build
npm run lint         # ESLint check
npm run rebuild      # Rebuild Electron native modules
```

### Testing
```bash
npm test                    # Run all tests
npm test -- projectStore    # Run tests for specific file (e.g., projectStore.test.ts)
npm test -- --run           # Run tests once without watch mode
npm test SettingsModal      # Run specific test file
```

### Running Single Tests
```bash
# Vitest supports pattern matching for test files
npm test src/test/projectStore.test.ts
npm test -- --reporter=verbose projectStore
```

## Code Style Guidelines

### TypeScript Configuration
- **Strict mode enabled**: `strict: true` in tsconfig.app.json
- **No unused variables**: `noUnusedLocals: true`, `noUnusedParameters: true`
- **JSX**: `react-jsx` transform
- **Target**: ES2022
- **Module resolution**: bundler mode with verbatim module syntax

### Import Conventions
```typescript
// Group imports by type, React first
import React, { useState, useEffect } from 'react';

// External libraries
import { create } from 'zustand';
import { X, Key } from 'lucide-react';

// Relative imports with path aliases
import type { Project, Chapter } from '@/types/electron';
import { useProjectStore } from '@/stores/projectStore';

// Internal types
import type { AIProvider } from '../types/electron';
```

### Naming Conventions
- **Components**: PascalCase (`SettingsModal`, `ProjectOverview`)
- **Functions**: camelCase (`handleSave`, `loadSettings`)
- **Variables**: camelCase (`apiKey`, `selectedProvider`)
- **Types/Interfaces**: PascalCase (`SettingsModalProps`, `ProjectState`)
- **Files**: PascalCase for components, camelCase for utilities
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_OPENROUTER_MODEL`)

### React Patterns
```typescript
// Functional components with proper typing
interface ComponentProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    // Hooks at top level
    const [apiKey, setApiKey] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Event handlers
    const handleSave = async () => {
        try {
            // Async operations with proper error handling
            await window.electronAPI.setAPIKey(selectedProvider, apiKey);
            setIsSaving(false);
        } catch (error) {
            console.error('Failed to save API key:', error);
        }
    };

    // Early returns for conditional rendering
    if (!isOpen) return null;

    return (
        <div className="premium-card">
            {/* JSX content */}
        </div>
    );
}
```

### State Management (Zustand)
```typescript
// Store definition with proper typing
interface ProjectState {
    currentProject: Project | null;
    projects: Project[];
    setCurrentProject: (project: Project | null) => void;
    addProject: (project: Project) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
    currentProject: null,
    projects: [],

    setCurrentProject: (currentProject) => set({ currentProject }),

    addProject: (project) => set((state) => ({
        projects: [project, ...state.projects]
    })),
}));
```

### Error Handling
```typescript
// Async operations with try/catch
const handleSave = async () => {
    try {
        await window.electronAPI.setAPIKey(selectedProvider, apiKey);
        setSaveSuccess(true);
    } catch (error) {
        console.error('Failed to save API key:', error);
        // Handle error appropriately
    }
};

// Electron API calls
const loadSettings = async () => {
    try {
        const hasApiKey = await window.electronAPI.hasAPIKey(selectedProvider);
        setHasKey(hasApiKey);
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
};
```

### Electron Main Process
```typescript
// Service pattern for Electron APIs
export class AIProviderService {
    private providers = new Map<string, AIProvider>();

    async generateText(provider: string, messages: Message[]): Promise<string> {
        const aiProvider = this.providers.get(provider);
        if (!aiProvider) {
            throw new Error(`Provider ${provider} not found`);
        }

        return aiProvider.generate(messages);
    }
}
```

### Testing Patterns
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from '../stores/projectStore';

describe('useProjectStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        useProjectStore.setState({
            projects: [],
            currentProject: null,
            chapters: []
        });
    });

    it('should add a project', () => {
        const project: Project = { /* ... */ };
        useProjectStore.getState().addProject(project);
        expect(useProjectStore.getState().projects).toContain(project);
    });
});
```

### CSS/Tailwind Classes
```typescript
// Consistent class ordering and responsive design
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 no-drag">
    <div className="premium-card w-full max-w-2xl p-6 rounded-2xl max-h-[80vh] overflow-y-auto">
        <button className="p-2 hover:bg-accent rounded-full transition-colors">
            <X size={20} />
        </button>
    </div>
</div>
```

### File Structure
```
src/
├── components/          # React components
│   ├── layout/         # Layout components
│   ├── shared/         # Reusable components
│   └── editor/         # Editor-specific components
├── stores/             # Zustand stores
├── types/              # TypeScript type definitions
├── hooks/              # Custom React hooks
├── test/               # Test files
└── assets/             # Static assets

electron/
├── main.ts             # Electron main process
├── preload.ts          # Preload script
└── services/           # Electron services
```

### Database Operations
```typescript
// SQLite operations with proper typing
export class DatabaseService {
    private db: Database.Database;

    async getProjects(): Promise<Project[]> {
        const stmt = this.db.prepare(`
            SELECT * FROM projects
            ORDER BY updated_at DESC
        `);
        return stmt.all() as Project[];
    }

    async createProject(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        const stmt = this.db.prepare(`
            INSERT INTO projects (id, title, target_word_count, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        stmt.run(id, project.title, project.target_word_count, project.status, now, now);

        return { ...project, id, created_at: now, updated_at: now };
    }
}
```

### Security Considerations
- API keys stored securely using system keychain
- Input validation with Zod schemas
- No secrets committed to repository
- Proper error handling without exposing sensitive information

### Performance Best Practices
- Use React.memo for expensive components
- Implement proper loading states
- Virtual scrolling for large lists
- Debounce expensive operations
- Use Zustand selectors to prevent unnecessary re-renders

### Git Workflow
- Always run `npm run lint` and `npm test` before committing
- Follow conventional commit messages
- Use descriptive branch names
- Keep commits focused and atomic

Remember to always run the lint and typecheck commands after making changes to ensure code quality is maintained.</content>
<parameter name="filePath">/Users/francis/.gemini/antigravity/playground/sonic-belt/AGENTS.md