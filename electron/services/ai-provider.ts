import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// AI Provider Interface
// ============================================================================

export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface GenerateOptions {
    temperature?: number;
    maxOutputTokens?: number;
    jsonMode?: boolean;
}

export interface AIProvider {
    name: string;
    maxTokens: number;
    generate(messages: Message[], options?: GenerateOptions): Promise<string>;
    generateStream?(messages: Message[], options?: GenerateOptions, onChunk?: (chunk: string) => void): Promise<string>;
}

// ============================================================================
// OpenAI Provider
// ============================================================================

export class OpenAIProvider implements AIProvider {
    name = 'OpenAI';
    maxTokens = 128000; // GPT-4 Turbo context window
    private client: OpenAI;
    private model: string;

    constructor(apiKey: string, model: string = 'gpt-4-turbo-preview') {
        this.client = new OpenAI({ apiKey });
        this.model = model;
    }

    async generate(messages: Message[], options?: GenerateOptions): Promise<string> {
        const response = await this.client.chat.completions.create({
            model: this.model,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxOutputTokens ?? 4000,
            response_format: options?.jsonMode ? { type: 'json_object' } : undefined,
        });

        return response.choices[0]?.message?.content || '';
    }

    async generateStream(
        messages: Message[],
        options?: GenerateOptions,
        onChunk?: (chunk: string) => void
    ): Promise<string> {
        const stream = await this.client.chat.completions.create({
            model: this.model,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxOutputTokens ?? 4000,
            stream: true,
        });

        let fullResponse = '';
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                fullResponse += content;
                onChunk?.(content);
            }
        }

        return fullResponse;
    }
}

// ============================================================================
// Anthropic Provider (Claude)
// ============================================================================

export class AnthropicProvider implements AIProvider {
    name = 'Anthropic';
    maxTokens = 200000; // Claude 3 context window
    private client: Anthropic;
    private model: string;

    constructor(apiKey: string, model: string = 'claude-3-5-sonnet-20241022') {
        this.client = new Anthropic({ apiKey });
        this.model = model;
    }

    async generate(messages: Message[], options?: GenerateOptions): Promise<string> {
        // Extract system message if present
        const systemMessage = messages.find(m => m.role === 'system');
        const conversationMessages = messages.filter(m => m.role !== 'system');

        const response = await this.client.messages.create({
            model: this.model,
            max_tokens: options?.maxOutputTokens ?? 4000,
            temperature: options?.temperature ?? 0.7,
            system: systemMessage?.content,
            messages: conversationMessages.map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
            })),
        });

        const textBlock = response.content.find(block => block.type === 'text');
        return textBlock && 'text' in textBlock ? textBlock.text : '';
    }

    async generateStream(
        messages: Message[],
        options?: GenerateOptions,
        onChunk?: (chunk: string) => void
    ): Promise<string> {
        const systemMessage = messages.find(m => m.role === 'system');
        const conversationMessages = messages.filter(m => m.role !== 'system');

        const stream = await this.client.messages.create({
            model: this.model,
            max_tokens: options?.maxOutputTokens ?? 4000,
            temperature: options?.temperature ?? 0.7,
            system: systemMessage?.content,
            messages: conversationMessages.map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
            })),
            stream: true,
        });

        let fullResponse = '';
        for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                const content = event.delta.text;
                fullResponse += content;
                onChunk?.(content);
            }
        }

        return fullResponse;
    }
}

// ============================================================================
// OpenRouter Provider (OpenAI-compatible API for 100+ models)
// ============================================================================

export class OpenRouterProvider implements AIProvider {
    name = 'OpenRouter';
    maxTokens = 128000; // Varies by model, using a reasonable default
    private client: OpenAI;
    private model: string;

    constructor(apiKey: string, model: string = 'meta-llama/llama-3.3-70b-instruct:free') {
        this.client = new OpenAI({
            apiKey,
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: {
                'HTTP-Referer': 'https://bouquine.app',
                'X-Title': 'Bouquine',
            },
        });
        this.model = model;
    }

    async generate(messages: Message[], options?: GenerateOptions): Promise<string> {
        try {
            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: messages.map(m => ({ role: m.role, content: m.content })),
                temperature: options?.temperature ?? 0.7,
                max_tokens: options?.maxOutputTokens ?? 4000,
            });

            return response.choices[0]?.message?.content || '';
        } catch (error: any) {
            console.error('[OpenRouter] API Error:', error.response?.data || error.message);
            throw error;
        }
    }

    async generateStream(
        messages: Message[],
        options?: GenerateOptions,
        onChunk?: (chunk: string) => void
    ): Promise<string> {
        const stream = await this.client.chat.completions.create({
            model: this.model,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxOutputTokens ?? 4000,
            stream: true,
        });

        let fullResponse = '';
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                fullResponse += content;
                onChunk?.(content);
            }
        }

        return fullResponse;
    }
}

// ============================================================================
// Provider Factory
// ============================================================================

export type ProviderType = 'openai' | 'anthropic' | 'openrouter';

export function createAIProvider(
    type: ProviderType,
    apiKey: string,
    model?: string
): AIProvider {
    switch (type) {
        case 'openai':
            return new OpenAIProvider(apiKey, model);
        case 'anthropic':
            return new AnthropicProvider(apiKey, model);
        case 'openrouter':
            return new OpenRouterProvider(apiKey, model);
        default:
            throw new Error(`Unknown provider type: ${type}`);
    }
}
