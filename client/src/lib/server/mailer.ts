import { Resend } from 'resend';
import { render } from '@react-email/render';
import { PasswordResetEmail } from './emails/PasswordResetEmail';
import { EmailVerificationEmail } from './emails/EmailVerificationEmail';
import { env } from '$env/dynamic/private';
import * as React from 'react';

const resend = new Resend(env.RESEND_API_KEY);

const FROM = env.EMAIL_FROM ?? 'games.kieran.dev <noreply@kieran.dev>';

export async function sendPasswordResetEmail(
	to: string,
	nickname: string,
	resetUrl: string
): Promise<void> {
	const html = await render(React.createElement(PasswordResetEmail, { nickname, resetUrl }));
	const text = await render(React.createElement(PasswordResetEmail, { nickname, resetUrl }), {
		plainText: true,
	});
	await resend.emails.send({
		from: FROM,
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
	await resend.emails.send({
		from: FROM,
		to,
		subject: 'Verify your email — games.kieran.dev',
		html,
		text,
	});
}
