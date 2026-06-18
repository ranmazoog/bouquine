import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration: number;
}

interface ToastState {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => string;
    dismissToast: (id: string) => void;
}

let counter = 0;
const nextId = () => `toast-${Date.now()}-${counter++}`;

export const useToastStore = create<ToastState>((set) => ({
    toasts: [],

    addToast: (toast) => {
        const id = nextId();
        set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
        return id;
    },

    dismissToast: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
