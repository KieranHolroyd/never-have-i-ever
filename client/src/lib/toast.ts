import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type ToastType = 'default' | 'info' | 'success' | 'warning' | 'error';

export type ToastAction = {
  label: string;
  onClick?: () => void;
};

export type ToastOptions = {
  type?: ToastType;
  duration?: number; // ms; 0 = persist
  dismissible?: boolean;
  action?: ToastAction;
};

export type Toast = {
  id: string;
  message: string;
  createdAt: number;
} & ToastOptions;

function generateId(): string {
  // Simple non-crypto unique id
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const toasts = writable<Toast[]>([]);

const timers = new Map<string, ReturnType<typeof setTimeout>>();

function addToast(message: string, opts: ToastOptions = {}): string {
  const id = generateId();
  const toast: Toast = {
    id,
    message,
    type: opts.type ?? 'default',
    duration: opts.duration ?? 3000,
    dismissible: opts.dismissible ?? true,
    action: opts.action,
    createdAt: Date.now()
  };

  toasts.update((items) => [toast, ...items]);

  if (browser && toast.duration && toast.duration > 0) {
    const t = setTimeout(() => dismiss(id), toast.duration);
    timers.set(id, t);
  }

  return id;
}

export function dismiss(id: string): void {
  const t = timers.get(id);
  if (t) {
    clearTimeout(t);
    timers.delete(id);
  }
  toasts.update((items) => items.filter((t) => t.id !== id));
}

export function clear(): void {
  timers.forEach((t) => clearTimeout(t));
  timers.clear();
  toasts.set([]);
}

export const toast = Object.assign(addToast, {
  show: addToast,
  info: (message: string, opts: Omit<ToastOptions, 'type'> = {}) => addToast(message, { ...opts, type: 'info' }),
  success: (message: string, opts: Omit<ToastOptions, 'type'> = {}) => addToast(message, { ...opts, type: 'success' }),
  warning: (message: string, opts: Omit<ToastOptions, 'type'> = {}) => addToast(message, { ...opts, type: 'warning' }),
  error: (message: string, opts: Omit<ToastOptions, 'type'> = {}) => addToast(message, { ...opts, type: 'error' })
});
