import type { Handle, HandleServerError } from '@sveltejs/kit';
import { building } from '$app/environment';
import { getPostHogClient } from '$lib/server/posthog';
import { auth } from '$lib/server/auth';
import { toAppUser } from '$lib/server/auth/user';
import { svelteKitHandler } from 'better-auth/svelte-kit';

export const handle: Handle = async ({ event, resolve }) => {
	try {
		const session = await auth.api.getSession({ headers: event.request.headers });
		event.locals.user = session?.user ? toAppUser(session.user) : null;
	} catch (err) {
		console.error('[auth] Session lookup failed:', err);
		event.locals.user = null;
	}

	const { pathname } = event.url;

	if (pathname.startsWith('/ingest')) {
		const useAssetHost =
			pathname.startsWith('/ingest/static/') || pathname.startsWith('/ingest/array/');
		const hostname = useAssetHost ? 'eu-assets.i.posthog.com' : 'eu.i.posthog.com';

		const url = new URL(event.request.url);
		url.protocol = 'https:';
		url.hostname = hostname;
		url.port = '443';
		url.pathname = pathname.replace(/^\/ingest/, '');

		const headers = new Headers(event.request.headers);
		headers.set('host', hostname);
		headers.set('accept-encoding', '');

		const clientIp = event.request.headers.get('x-forwarded-for') || event.getClientAddress();
		if (clientIp) {
			headers.set('x-forwarded-for', clientIp);
		}

		const response = await fetch(url.toString(), {
			method: event.request.method,
			headers,
			body: event.request.body,
			// @ts-expect-error - duplex is required for streaming request bodies
			duplex: 'half'
		});

		return response;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handleError: HandleServerError = async ({ error, status, message }) => {
	const posthog = getPostHogClient();
	posthog?.capture({
		distinctId: 'server',
		event: 'server_error',
		properties: {
			error: error instanceof Error ? error.message : String(error),
			status,
			message
		}
	});
	return { message, status };
};
