import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from './logger';

// ============================================================================
// OpenRouter model configuration
// ============================================================================
// Verified against the live OpenRouter catalog on 2026-06-18.
// The previous default (google/gemini-2.0-flash-001) was de-listed and returns
// 404 "no endpoints", and several previously-recommended :free models are gone
// or heavily rate-limited (429). The chain below is ordered for reliability:
// a cheap, dependable paid model first, then alternatives, with a free model
// last as a best-effort option for users without OpenRouter credit.
export const OPENROUTER_DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct';
const OPENROUTER_FALLBACK_MODELS = [
    'meta-llama/llama-3.3-70b-instruct', // cheap (~$0.10/$0.32 per M), reliable, strong prose
    'google/gemini-2.5-flash',           // fast, capable alternative
    'meta-llama/llama-3.3-70b-instruct:free', // free, but frequently rate-limited (429)
];

// Read the HTTP status from however the OpenAI SDK surfaces it. The SDK (v6)
// exposes it as error.status; older shapes used error.response.status.
function getErrorStatus(error: any): number | undefined {
    return error?.status ?? error?.response?.status ?? error?.statusCode;
}

// A request is worth retrying on a *different* model when the current model is
// unavailable (404 / "no endpoints") or rate-limited (429). Auth/quota/validation
// errors (401/402/403/400) are not — a different model won't fix the key.
function shouldFallBackToAnotherModel(error: any): boolean {
    const status = getErrorStatus(error);
    if (status === 404 || status === 429) return true;
    const msg = String(error?.message || '').toLowerCase();
    return msg.includes('no endpoints') || msg.includes('not available') || msg.includes('unavailable');
}

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

    // gpt-4-turbo-preview is a legacy alias; gpt-4o-mini is current, reliable,
    // and inexpensive for a first generation.
    constructor(apiKey: string, model: string = 'gpt-4o-mini') {
        this.client = new OpenAI({ apiKey });
        this.model = model;
    }

    async generate(messages: Message[], options?: GenerateOptions): Promise<string> {
        try {
            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: messages.map(m => ({ role: m.role, content: m.content })),
                temperature: options?.temperature ?? 0.7,
                max_tokens: options?.maxOutputTokens ?? 4000,
                response_format: options?.jsonMode ? { type: 'json_object' } : undefined,
            });

            return response.choices?.[0]?.message?.content || '';
        } catch (error: any) {
            const errorDetail = error.response?.data || error.message;
            logger.logError(`[OpenAI] API Error: ${JSON.stringify(errorDetail)}`, error);
            throw error;
        }
    }

    async generateStream(
        messages: Message[],
        options?: GenerateOptions,
        onChunk?: (chunk: string) => void
    ): Promise<string> {
        try {
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
        } catch (error: any) {
            const errorDetail = error.response?.data || error.message;
            logger.logError(`[OpenAI-Stream] API Error: ${JSON.stringify(errorDetail)}`, error);
            throw error;
        }
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

    // claude-3-5-sonnet-20241022 was retired (2025-10-28). claude-sonnet-4-6 is
    // the current drop-in replacement.
    constructor(apiKey: string, model: string = 'claude-sonnet-4-6') {
        this.client = new Anthropic({ apiKey });
        this.model = model;
    }

    async generate(messages: Message[], options?: GenerateOptions): Promise<string> {
        try {
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
        } catch (error: any) {
            const errorDetail = error.response?.data || error.message;
            logger.logError(`[Anthropic] API Error: ${JSON.stringify(errorDetail)}`, error);
            throw error;
        }
    }

    async generateStream(
        messages: Message[],
        options?: GenerateOptions,
        onChunk?: (chunk: string) => void
    ): Promise<string> {
        try {
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
        } catch (error: any) {
            const errorDetail = error.response?.data || error.message;
            logger.logError(`[Anthropic-Stream] API Error: ${JSON.stringify(errorDetail)}`, error);
            throw error;
        }
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

    constructor(apiKey: string, model: string = OPENROUTER_DEFAULT_MODEL) {
        logger.logInfo("Initializing OpenRouter with Model: " + model);
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

    // Ordered, de-duplicated list of models to attempt: the user's selected
    // model first, then the reliability fallbacks.
    private modelChain(): string[] {
        return [this.model, ...OPENROUTER_FALLBACK_MODELS].filter((m, i, a) => a.indexOf(m) === i);
    }

    async generate(messages: Message[], options?: GenerateOptions): Promise<string> {
        const chain = this.modelChain();
        let lastError: any;

        for (let i = 0; i < chain.length; i++) {
            const model = chain[i];
            try {
                const response = await this.client.chat.completions.create({
                    model,
                    messages: messages.map(m => ({ role: m.role, content: m.content })),
                    temperature: options?.temperature ?? 0.7,
                    max_tokens: options?.maxOutputTokens ?? 4000,
                });
                if (i > 0) logger.logInfo(`[OpenRouter] Recovered using fallback model "${model}".`);
                return response.choices?.[0]?.message?.content || '';
            } catch (error: any) {
                lastError = error;
                const status = getErrorStatus(error);
                logger.logError(`[OpenRouter] Model "${model}" failed (${status || 'unknown'}): ${error.message}`, error);

                if (i < chain.length - 1 && shouldFallBackToAnotherModel(error)) {
                    logger.logInfo(`[OpenRouter] Falling back from "${model}" to "${chain[i + 1]}"...`);
                    continue;
                }
                throw error;
            }
        }
        throw lastError;
    }

    async generateStream(
        messages: Message[],
        options?: GenerateOptions,
        onChunk?: (chunk: string) => void
    ): Promise<string> {
        const chain = this.modelChain();
        let lastError: any;

        for (let i = 0; i < chain.length; i++) {
            const model = chain[i];
            let emittedAny = false;
            try {
                const stream = await this.client.chat.completions.create({
                    model,
                    messages: messages.map(m => ({ role: m.role, content: m.content })),
                    temperature: options?.temperature ?? 0.7,
                    max_tokens: options?.maxOutputTokens ?? 4000,
                    stream: true,
                });

                let fullResponse = '';
                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        emittedAny = true;
                        fullResponse += content;
                        onChunk?.(content);
                    }
                }
                if (i > 0) logger.logInfo(`[OpenRouter-Stream] Recovered using fallback model "${model}".`);
                return fullResponse;
            } catch (error: any) {
                lastError = error;
                const status = getErrorStatus(error);
                logger.logError(`[OpenRouter-Stream] Model "${model}" failed (${status || 'unknown'}): ${error.message}`, error);

                // Only fall back if nothing was streamed yet — otherwise the user
                // would see partial text from two different models concatenated.
                if (!emittedAny && i < chain.length - 1 && shouldFallBackToAnotherModel(error)) {
                    logger.logInfo(`[OpenRouter-Stream] Falling back from "${model}" to "${chain[i + 1]}"...`);
                    continue;
                }
                throw error;
            }
        }
        throw lastError;
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
