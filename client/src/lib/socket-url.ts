const DEFAULT_SOCKET_URL = 'ws://localhost:3000/ws';

function normalizeSocketBaseUrl(rawUrl?: string): string {
	const candidate = rawUrl?.trim();
	if (candidate) {
		return normalizeExplicitSocketUrl(candidate);
	}

	if (typeof window !== 'undefined') {
		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		return `${protocol}//${window.location.host}/ws`;
	}

	return DEFAULT_SOCKET_URL;
}

function normalizeExplicitSocketUrl(rawUrl: string): string {
	const url = new URL(rawUrl);
	const pathname = url.pathname.replace(/\/+$/, '');
	url.pathname = pathname === '' ? '/ws' : pathname;
	url.search = '';
	url.hash = '';
	return url.toString().replace(/\/$/, '');
}

export function buildSocketUrl(
	rawUrl: string | undefined,
	params: Record<string, string>
): string {
	const url = new URL(normalizeSocketBaseUrl(rawUrl));
	url.search = new URLSearchParams(params).toString();
	return url.toString();
}