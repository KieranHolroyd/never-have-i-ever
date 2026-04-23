// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import 'unplugin-icons/types/svelte';
import type { User } from '$lib/server/auth-schema';
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: User | null;
		}
		// interface PageData {}
		// interface Platform {}
	}
}
declare module 'svelte-outside-click';

export {};
