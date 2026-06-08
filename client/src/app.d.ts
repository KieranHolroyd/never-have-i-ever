// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import 'unplugin-icons/types/svelte';
import type { AppUser } from '$lib/server/auth/user';
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: AppUser | null;
		}
		// interface PageData {}
		// interface Platform {}
	}
}
declare module 'svelte-outside-click';

export {};
