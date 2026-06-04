import posthog from 'posthog-js';

/** PostHog may be blocked or not initialised — never let analytics break UX. */
export function safeCapture(
	event: string,
	properties?: Record<string, unknown>
): void {
	try {
		if (typeof posthog.capture === 'function') {
			posthog.capture(event, properties);
		}
	} catch {
		// ignore
	}
}

export function safeIdentify(distinctId: string, properties?: Record<string, unknown>): void {
	try {
		if (typeof posthog.identify === 'function') {
			posthog.identify(distinctId, properties);
		}
	} catch {
		// ignore
	}
}

export function safeCaptureException(error: unknown): void {
	try {
		if (typeof posthog.captureException === 'function') {
			posthog.captureException(error);
		}
	} catch {
		// ignore
	}
}
