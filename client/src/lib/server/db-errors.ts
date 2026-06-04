/** Postgres undefined_column */
export function isMissingColumnError(err: unknown): boolean {
	if (!(err instanceof Error)) return false;
	const code = (err as { code?: string }).code;
	if (code === '42703') return true;
	return /column .+ does not exist/i.test(err.message);
}
