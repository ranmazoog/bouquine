import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useToastStore } from '../../stores/toastStore';
import type { Toast } from '../../stores/toastStore';

const ICONS = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
} as const;

const ACCENTS = {
    success: 'text-green-500 border-l-green-500',
    error: 'text-red-500 border-l-red-500',
    info: 'text-blue-500 border-l-blue-500',
} as const;

function ToastItem({ toast }: { toast: Toast }) {
    const dismissToast = useToastStore((s) => s.dismissToast);
    const Icon = ICONS[toast.type];

    useEffect(() => {
        const timer = setTimeout(() => dismissToast(toast.id), toast.duration);
        return () => clearTimeout(timer);
    }, [toast.id, toast.duration, dismissToast]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            role="status"
            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
            className={`pointer-events-auto premium-card glass border-l-4 ${ACCENTS[toast.type]} rounded-lg shadow-lg px-4 py-3 flex items-start gap-3 w-80 max-w-[90vw]`}
        >
            <Icon size={18} className={`${ACCENTS[toast.type].split(' ')[0]} mt-0.5 flex-shrink-0`} />
            <p className="text-sm text-foreground leading-snug flex-1 break-words">{toast.message}</p>
            <button
                onClick={() => dismissToast(toast.id)}
                className="p-1 -m-1 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                aria-label="Dismiss notification"
            >
                <X size={14} />
            </button>
        </motion.div>
    );
}

/**
 * Global toast container. Mount once near the app root. Renders the toast
 * queue from the toast store; trigger toasts imperatively via `toast` in
 * `lib/toast.ts`.
 */
export function Toaster() {
    const toasts = useToastStore((s) => s.toasts);

    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none no-drag">
            <AnimatePresence initial={false}>
                {toasts.map((t) => (
                    <ToastItem key={t.id} toast={t} />
                ))}
            </AnimatePresence>
        </div>
    );
}
