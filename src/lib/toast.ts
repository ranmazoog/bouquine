import { useToastStore } from '../stores/toastStore';
import type { ToastType } from '../stores/toastStore';

const DEFAULT_DURATION = 4000;
const ERROR_DURATION = 6000;

function show(type: ToastType, message: string, duration?: number): string {
    return useToastStore.getState().addToast({
        type,
        message,
        duration: duration ?? (type === 'error' ? ERROR_DURATION : DEFAULT_DURATION),
    });
}

/**
 * Imperative toast API — callable from components, stores, or any module.
 *
 *   toast.success('Project created successfully.')
 *   toast.error('Unable to create project. Please try again.')
 *   toast.info('Generating synopsis...')
 *
 * Show friendly, human-readable messages to users. Always log the underlying
 * technical error with console.error() separately for debugging.
 */
export const toast = {
    success: (message: string, duration?: number) => show('success', message, duration),
    error: (message: string, duration?: number) => show('error', message, duration),
    info: (message: string, duration?: number) => show('info', message, duration),
    dismiss: (id: string) => useToastStore.getState().dismissToast(id),
};
