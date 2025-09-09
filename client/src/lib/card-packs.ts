import type { CardPack } from './types';

// Fake card pack data for development and demonstration
// This data structure matches what would come from a real API or database

export const FAKE_CARD_PACKS: CardPack[] = [
	{
		id: 'base-game',
		name: 'Base Game',
		description: 'The original Cards Against Humanity cards. Classic and hilarious.',
		author: 'Cards Against Humanity LLC',
		version: '1.0.0',
		isOfficial: true,
		isNSFW: true,
		blackCards: [
			{
				id: 'black-1',
				text: "Why can't I sleep at night?",
				pick: 1
			},
			{
				id: 'black-2',
				text: "I got 99 problems but _____ ain't one.",
				pick: 1
			},
			{
				id: 'black-3',
				text: "What's that smell?",
				pick: 1
			},
			{
				id: 'black-4',
				text: "What's the next superhero movie about?",
				pick: 1
			},
			{
				id: 'black-5',
				text: 'Anthropologists have recently discovered a primitive tribe that worships _____.',
				pick: 1
			},
			{
				id: 'black-6',
				text: "It's a pity that kids these days are all getting involved with _____.",
				pick: 1
			},
			{
				id: 'black-7',
				text: "During Picasso's often-overlooked Brown Period, he produced hundreds of paintings of _____.",
				pick: 1
			},
			{
				id: 'black-8',
				text: 'Alternative medicine is now embracing the curative powers of _____.',
				pick: 1
			},
			{
				id: 'black-9',
				text: 'And the Academy Award for _____ goes to _____.',
				pick: 2
			},
			{
				id: 'black-10',
				text: 'For my next trick, I will pull _____ out of _____.',
				pick: 2
			}
		],
		whiteCards: [
			{
				id: 'white-1',
				text: 'Being on fire.'
			},
			{
				id: 'white-2',
				text: 'Racism.'
			},
			{
				id: 'white-3',
				text: 'Old-people smell.'
			},
			{
				id: 'white-4',
				text: 'A micropenis.'
			},
			{
				id: 'white-5',
				text: 'Women in yogurt commercials.'
			},
			{
				id: 'white-6',
				text: 'Classist undertones.'
			},
			{
				id: 'white-7',
				text: 'Not giving a fuck.'
			},
			{
				id: 'white-8',
				text: 'Sexting.'
			},
			{
				id: 'white-9',
				text: 'Roofies.'
			},
			{
				id: 'white-10',
				text: 'A man on the brink of orgasm.'
			},
			{
				id: 'white-11',
				text: 'Peeing a little bit.'
			},
			{
				id: 'white-12',
				text: 'The miracle of childbirth.'
			},
			{
				id: 'white-13',
				text: 'Flesh-eating bacteria.'
			},
			{
				id: 'white-14',
				text: 'A salty surprise.'
			},
			{
				id: 'white-15',
				text: 'The Big Bang.'
			},
			{
				id: 'white-16',
				text: 'Anal beads.'
			},
			{
				id: 'white-17',
				text: 'Amputees.'
			},
			{
				id: 'white-18',
				text: 'Men.'
			},
			{
				id: 'white-19',
				text: 'The gays.'
			},
			{
				id: 'white-20',
				text: 'Crippling debt.'
			}
		],
		metadata: {
			totalBlackCards: 10,
			totalWhiteCards: 20,
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z'
		}
	},
	{
		id: 'expansion-1',
		name: 'The First Expansion',
		description: 'More cards for more laughs. Contains additional black and white cards.',
		author: 'Cards Against Humanity LLC',
		version: '1.0.0',
		isOfficial: true,
		isNSFW: true,
		blackCards: [
			{
				id: 'exp1-black-1',
				text: 'What did I bring back from Mexico?',
				pick: 1
			},
			{
				id: 'exp1-black-2',
				text: 'A romantic, candlelit dinner would be incomplete without _____.',
				pick: 1
			},
			{
				id: 'exp1-black-3',
				text: 'My new favorite porn star is Joey "_____" McGee.',
				pick: 1
			},
			{
				id: 'exp1-black-4',
				text: 'Before I run for president, I must destroy all evidence of my involvement with _____.',
				pick: 1
			},
			{
				id: 'exp1-black-5',
				text: 'This is the way the world ends. This is the way the world ends. Not with a bang but with _____.',
				pick: 1
			}
		],
		whiteCards: [
			{
				id: 'exp1-white-1',
				text: 'A snapping turtle biting the tip of your penis.'
			},
			{
				id: 'exp1-white-2',
				text: 'Muhammad Ali.'
			},
			{
				id: 'exp1-white-3',
				text: 'Daddy issues.'
			},
			{
				id: 'exp1-white-4',
				text: 'The Donald Trump Seal of Approval.'
			},
			{
				id: 'exp1-white-5',
				text: 'Fisting.'
			},
			{
				id: 'exp1-white-6',
				text: 'Golden showers.'
			},
			{
				id: 'exp1-white-7',
				text: 'Wiping her butt.'
			},
			{
				id: 'exp1-white-8',
				text: 'Queefing.'
			},
			{
				id: 'exp1-white-9',
				text: 'Getting drunk on mouthwash.'
			},
			{
				id: 'exp1-white-10',
				text: 'A Super Soaker™ full of cat pee.'
			}
		],
		metadata: {
			totalBlackCards: 5,
			totalWhiteCards: 10,
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z'
		}
	},
	{
		id: 'family-friendly',
		name: 'Family Friendly Pack',
		description: 'Clean cards perfect for family game night. No swearing, no adult themes.',
		author: 'Community Contributors',
		version: '1.0.0',
		isOfficial: false,
		isNSFW: false,
		blackCards: [
			{
				id: 'fam-black-1',
				text: 'What makes me happy?',
				pick: 1
			},
			{
				id: 'fam-black-2',
				text: 'My favorite childhood memory is _____.',
				pick: 1
			},
			{
				id: 'fam-black-3',
				text: 'I love going to the zoo to see _____.',
				pick: 1
			},
			{
				id: 'fam-black-4',
				text: "Grandma's famous recipe calls for _____.",
				pick: 1
			},
			{
				id: 'fam-black-5',
				text: 'The best part of school is _____.',
				pick: 1
			}
		],
		whiteCards: [
			{
				id: 'fam-white-1',
				text: 'Ice cream.'
			},
			{
				id: 'fam-white-2',
				text: 'Puppies.'
			},
			{
				id: 'fam-white-3',
				text: 'Rainbow unicorns.'
			},
			{
				id: 'fam-white-4',
				text: 'Blowing bubbles.'
			},
			{
				id: 'fam-white-5',
				text: 'Hugs and kisses.'
			},
			{
				id: 'fam-white-6',
				text: 'Building sandcastles.'
			},
			{
				id: 'fam-white-7',
				text: 'Cotton candy.'
			},
			{
				id: 'fam-white-8',
				text: 'Teddy bears.'
			},
			{
				id: 'fam-white-9',
				text: 'Butterflies.'
			},
			{
				id: 'fam-white-10',
				text: 'Birthday cake.'
			}
		],
		metadata: {
			totalBlackCards: 5,
			totalWhiteCards: 10,
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z'
		}
	},
	{
		id: 'tech-pack',
		name: 'Tech Bros Expansion',
		description:
			'Cards for programmers, developers, and tech enthusiasts. May contain inside jokes.',
		author: 'Anonymous Developer',
		version: '1.2.1',
		isOfficial: false,
		isNSFW: false,
		blackCards: [
			{
				id: 'tech-black-1',
				text: 'The worst part of being a developer is _____.',
				pick: 1
			},
			{
				id: 'tech-black-2',
				text: 'My code review feedback was _____.',
				pick: 1
			},
			{
				id: 'tech-black-3',
				text: 'Stack Overflow says the solution is _____.',
				pick: 1
			},
			{
				id: 'tech-black-4',
				text: 'The agile ceremony I hate most is _____.',
				pick: 1
			},
			{
				id: 'tech-black-5',
				text: 'My favorite JavaScript framework is _____.',
				pick: 1
			}
		],
		whiteCards: [
			{
				id: 'tech-white-1',
				text: 'React.'
			},
			{
				id: 'tech-white-2',
				text: 'Angular.'
			},
			{
				id: 'tech-white-3',
				text: 'Vue.js.'
			},
			{
				id: 'tech-white-4',
				text: 'Svelte.'
			},
			{
				id: 'tech-white-5',
				text: 'TypeScript.'
			},
			{
				id: 'tech-white-6',
				text: 'Docker.'
			},
			{
				id: 'tech-white-7',
				text: 'Kubernetes.'
			},
			{
				id: 'tech-white-8',
				text: 'Git rebase.'
			},
			{
				id: 'tech-white-9',
				text: 'Merge conflicts.'
			},
			{
				id: 'tech-white-10',
				text: 'Coffee.'
			}
		],
		metadata: {
			totalBlackCards: 5,
			totalWhiteCards: 10,
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z'
		}
	}
];

// Helper functions for working with card packs
export function getPackById(id: string): CardPack | undefined {
	return FAKE_CARD_PACKS.find((pack) => pack.id === id);
}

export function getOfficialPacks(): CardPack[] {
	return FAKE_CARD_PACKS.filter((pack) => pack.isOfficial);
}

export function getCommunityPacks(): CardPack[] {
	return FAKE_CARD_PACKS.filter((pack) => !pack.isOfficial);
}

export function getNSFWFreePacks(): CardPack[] {
	return FAKE_CARD_PACKS.filter((pack) => !pack.isNSFW);
}

export function calculateTotalCards(selectedPackIds: string[]): {
	totalBlack: number;
	totalWhite: number;
} {
	let totalBlack = 0;
	let totalWhite = 0;

	selectedPackIds.forEach((packId) => {
		const pack = getPackById(packId);
		if (pack) {
			totalBlack += pack.metadata.totalBlackCards;
			totalWhite += pack.metadata.totalWhiteCards;
		}
	});

	return { totalBlack, totalWhite };
}
