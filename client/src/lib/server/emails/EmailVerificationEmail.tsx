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

interface EmailVerificationEmailProps {
	nickname: string;
	verifyUrl: string;
}

export function EmailVerificationEmail({ nickname, verifyUrl }: EmailVerificationEmailProps) {
	return (
		<Html>
			<Head />
			<Preview>Verify your email for games.kieran.dev</Preview>
			<Body style={main}>
				<Container style={container}>
					<Heading style={h1}>Verify your email</Heading>
					<Text style={text}>Hi {nickname},</Text>
					<Text style={text}>
						Thanks for creating an account on games.kieran.dev! Click the button below to verify
						your email address. This link expires in 24 hours.
					</Text>
					<Section style={buttonSection}>
						<Button href={verifyUrl} style={button}>
							Verify email
						</Button>
					</Section>
					<Text style={mutedText}>
						If you didn't create an account, you can safely ignore this email.
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
