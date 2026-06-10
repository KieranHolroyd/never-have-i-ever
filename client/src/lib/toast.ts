import { toast as sonnerToast } from 'svelte-sonner';

export type { ExternalToast as ToastOptions } from 'svelte-sonner';

export const toast = Object.assign(sonnerToast, {
	show: sonnerToast
});

export const dismiss = sonnerToast.dismiss;

export function clear(): void {
	sonnerToast.dismiss();
}
