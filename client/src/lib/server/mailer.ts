import { Resend } from 'resend';
import { render } from '@react-email/render';
import { PasswordResetEmail } from './emails/PasswordResetEmail';
import { EmailVerificationEmail } from './emails/EmailVerificationEmail';
import { env } from '$env/dynamic/private';
import * as React from 'react';

const FROM = env.EMAIL_FROM ?? 'games.kieran.dev <noreply@kieran.dev>';

function getResendClient(): Resend {
	const apiKey = env.RESEND_API_KEY?.trim();
	if (!apiKey) {
		throw new Error('RESEND_API_KEY is not configured.');
	}
	return new Resend(apiKey);
}

async function sendEmail(payload: {
	to: string;
	subject: string;
	html: string;
	text: string;
}): Promise<void> {
	const resend = getResendClient();
	const result = await resend.emails.send({
		from: FROM,
		to: payload.to,
		subject: payload.subject,
		html: payload.html,
		text: payload.text,
	});

	if (result.error) {
		const message =
			typeof result.error.message === 'string'
				? result.error.message
				: 'Failed to send email.';
		console.error('[mailer] Resend error:', result.error);
		throw new Error(message);
	}
}

export async function sendPasswordResetEmail(
	to: string,
	nickname: string,
	resetUrl: string
): Promise<void> {
	const html = await render(React.createElement(PasswordResetEmail, { nickname, resetUrl }));
	const text = await render(React.createElement(PasswordResetEmail, { nickname, resetUrl }), {
		plainText: true,
	});
	await sendEmail({
		to,
		subject: 'Reset your password — games.kieran.dev',
		html,
		text,
	});
}

export async function sendEmailVerificationEmail(
	to: string,
	nickname: string,
	verifyUrl: string
): Promise<void> {
	const html = await render(
		React.createElement(EmailVerificationEmail, { nickname, verifyUrl })
	);
	const text = await render(
		React.createElement(EmailVerificationEmail, { nickname, verifyUrl }),
		{ plainText: true }
	);
	await sendEmail({
		to,
		subject: 'Verify your email — games.kieran.dev',
		html,
		text,
	});
}
