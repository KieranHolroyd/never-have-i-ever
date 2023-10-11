import { browser } from '$app/environment';

export class Tutorial {
	public static markAsSeen(id: string): void {
		if (!browser) return;
		localStorage.setItem(`tutorial:${id}`, 'true');
	}

	public static isSeen(id: string): boolean {
		if (!browser) return true; // Assume seen if not in browser
		const ls_tutorial = localStorage.getItem(`tutorial:${id}`);

		return ls_tutorial === 'true';
	}
}
