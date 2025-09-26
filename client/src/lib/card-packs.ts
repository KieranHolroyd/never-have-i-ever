import type { CardPack } from './types';

// Cache for card packs to avoid repeated API calls
let cardPacksCache: CardPack[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getCardPacks(): Promise<CardPack[]> {
	// Return cached data if it's still fresh
	if (cardPacksCache && cacheTimestamp && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
		return cardPacksCache;
	}

	try {
		const response = await fetch('/api/cah-packs');
		if (!response.ok) {
			throw new Error(`Failed to fetch card packs: ${response.status}`);
		}
		const packs = await response.json();

		// Cache the result
		cardPacksCache = packs;
		cacheTimestamp = Date.now();

		return packs;
	} catch (error) {
		console.error('Error fetching card packs:', error);
		// Return empty array on error to prevent crashes
		return [];
	}
}

// For backward compatibility, provide a synchronous getter that returns cached data
// or empty array if not loaded yet
export function getCachedCardPacks(): CardPack[] {
	return cardPacksCache || [];
}

// Helper functions for working with card packs
export function getPackById(id: string): CardPack | undefined {
	return getCachedCardPacks().find((pack) => pack.id === id);
}

export function getOfficialPacks(): CardPack[] {
	return getCachedCardPacks().filter((pack) => pack.isOfficial);
}

export function getCommunityPacks(): CardPack[] {
	return getCachedCardPacks().filter((pack) => !pack.isOfficial);
}

export function getNSFWFreePacks(): CardPack[] {
	return getCachedCardPacks().filter((pack) => !pack.isNSFW);
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
			totalBlack += pack.blackCards;
			totalWhite += pack.whiteCards;
		}
	});

	return { totalBlack, totalWhite };
}
