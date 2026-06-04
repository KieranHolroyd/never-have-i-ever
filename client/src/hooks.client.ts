import posthog from 'posthog-js';
import { env } from '$env/dynamic/public';
import { safeCaptureException } from '$lib/analytics';
import type { HandleClientError } from '@sveltejs/kit';

export async function init() {
	if (!env.PUBLIC_POSTHOG_PROJECT_TOKEN) return;
	posthog.init(env.PUBLIC_POSTHOG_PROJECT_TOKEN, {
		api_host: '/ingest',
		ui_host: 'https://eu.posthog.com',
		defaults: '2026-01-30',
		capture_exceptions: true
	});
}

export const handleError: HandleClientError = async ({ error, status, message }) => {
	safeCaptureException(error);
	return { message, status };
};
