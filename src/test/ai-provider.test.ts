import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenAIProvider } from '../../electron/services/ai-provider';

// Mock OpenAI class
const mockCreate = vi.fn();

vi.mock('openai', () => {
    return {
        default: class {
            chat = {
                completions: {
                    create: mockCreate
                }
            };
            constructor() { }
        }
    }
});

describe('OpenAIProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should generate text', async () => {
        mockCreate.mockResolvedValue({
            choices: [{ message: { content: 'Hello World' } }]
        });

        const provider = new OpenAIProvider('test-key');
        const result = await provider.generate([{ role: 'user', content: 'Hi' }]);

        expect(result).toBe('Hello World');
        expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
            model: 'gpt-4-turbo-preview',
            messages: [{ role: 'user', content: 'Hi' }]
        }));
    });
});
