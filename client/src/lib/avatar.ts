/** Stable per-player avatar colors + initials, shared across lobby/play/results. */

const AVATAR_PALETTE = [
	'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
	'bg-sky-500/15 text-sky-600 dark:text-sky-300',
	'bg-violet-500/15 text-violet-600 dark:text-violet-300',
	'bg-amber-500/15 text-amber-600 dark:text-amber-300',
	'bg-rose-500/15 text-rose-600 dark:text-rose-300',
	'bg-teal-500/15 text-teal-600 dark:text-teal-300'
];

export function avatarColorClass(seed: string): string {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		hash = (hash * 31 + seed.charCodeAt(i)) | 0;
	}
	return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export function initials(name: string): string {
	return name
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? '')
		.join('');
}
