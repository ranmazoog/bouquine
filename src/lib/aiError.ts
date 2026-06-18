/**
 * Map a raw AI-provider error into a friendly, human-readable message with a
 * suggested action. Always log the original error to the console separately for
 * debugging — show only the returned string to the writer.
 *
 *   try { ...AI call... }
 *   catch (err) { console.error(err); toast.error(friendlyAIError(err)); }
 */
export function friendlyAIError(error: unknown): string {
    const raw = error instanceof Error ? error.message : String(error ?? '');
    const m = raw.toLowerCase();

    // Model no longer available / deprecated (OpenRouter "no endpoints", 404)
    if (
        m.includes('no endpoints') ||
        m.includes('not available') ||
        m.includes('no longer available') ||
        m.includes('not a valid model') ||
        m.includes('404')
    ) {
        return 'This model is no longer available from your AI provider. Open Settings to choose a different model.';
    }

    // Rate limited
    if (
        m.includes('429') ||
        m.includes('rate limit') ||
        m.includes('rate-limit') ||
        m.includes('free-models-per-day') ||
        m.includes('temporarily rate')
    ) {
        return 'The selected model is currently rate limited. Wait a minute and try again, or switch to a different model in Settings.';
    }

    // Auth / missing key
    if (
        m.includes('401') ||
        m.includes('invalid api key') ||
        m.includes('no auth') ||
        m.includes('no cookie auth') ||
        m.includes('authentication')
    ) {
        return 'Your API key is missing or invalid. Open Settings (⚙️) to add or update it.';
    }

    // Out of credit / quota
    if (
        m.includes('insufficient_quota') ||
        m.includes('insufficient credit') ||
        m.includes('quota') ||
        m.includes('402') ||
        m.includes('payment required')
    ) {
        return 'Your provider account is out of credit or quota. Add credit, or switch to a free model in Settings.';
    }

    // Network / connectivity
    if (
        m.includes('timeout') ||
        m.includes('network') ||
        m.includes('fetch failed') ||
        m.includes('econn') ||
        m.includes('enotfound')
    ) {
        return 'Could not reach the AI provider. Check your internet connection and try again.';
    }

    return 'The AI request failed. Please try again, or check your provider and model in Settings.';
}
