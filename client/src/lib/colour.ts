export const voteBadgeClass: Record<string, string> = {
	null: 'bg-muted text-muted-foreground',
	Have: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
	Kinda: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
	'Have Not': 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
};

/** @deprecated Use voteBadgeClass */
export const colour_map = voteBadgeClass;
