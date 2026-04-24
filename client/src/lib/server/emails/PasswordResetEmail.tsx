import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Preview,
	Section,
	Text
} from '@react-email/components';
import * as React from 'react';

interface PasswordResetEmailProps {
	nickname: string;
	resetUrl: string;
}

export function PasswordResetEmail({ nickname, resetUrl }: PasswordResetEmailProps) {
	return (
		<Html>
			<Head />
			<Preview>Reset your password for games.kieran.dev</Preview>
			<Body style={main}>
				<Container style={container}>
					<Heading style={h1}>Reset your password</Heading>
					<Text style={text}>Hi {nickname},</Text>
					<Text style={text}>
						We received a request to reset your password for your games.kieran.dev account. Click
						the button below to choose a new password. This link expires in 1 hour.
					</Text>
					<Section style={buttonSection}>
						<Button href={resetUrl} style={button}>
							Reset password
						</Button>
					</Section>
					<Text style={mutedText}>
						If you didn't request this, you can safely ignore this email — your password won't
						change.
					</Text>
					<Hr style={hr} />
					<Text style={footer}>games.kieran.dev</Text>
				</Container>
			</Body>
		</Html>
	);
}

const main = {
	backgroundColor: '#09090b',
	fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
};

const container = {
	margin: '0 auto',
	padding: '40px 20px',
	maxWidth: '480px'
};

const h1 = {
	color: '#ffffff',
	fontSize: '24px',
	fontWeight: '700',
	margin: '0 0 24px'
};

const text = {
	color: '#a1a1aa',
	fontSize: '15px',
	lineHeight: '24px',
	margin: '0 0 16px'
};

const mutedText = {
	color: '#71717a',
	fontSize: '13px',
	lineHeight: '20px',
	margin: '16px 0 0'
};

const buttonSection = {
	margin: '28px 0'
};

const button = {
	backgroundColor: '#10b981',
	borderRadius: '8px',
	color: '#ffffff',
	display: 'inline-block',
	fontSize: '15px',
	fontWeight: '600',
	padding: '12px 24px',
	textDecoration: 'none'
};

const hr = {
	borderColor: '#27272a',
	margin: '32px 0 16px'
};

const footer = {
	color: '#52525b',
	fontSize: '12px',
	margin: '0'
};
