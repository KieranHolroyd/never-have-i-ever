<script lang="ts">
	import { goto } from '$app/navigation';
	import MdiCheck from '~icons/mdi/check';
	import MdiClose from '~icons/mdi/close';
	import MdiCrown from '~icons/mdi/crown';
	import MdiAccountGroup from '~icons/mdi/account-group';
	import type { CardPack, SelectedPacks } from '$lib/types';
	import { getCardPacks, getCachedCardPacks, calculateTotalCards } from '$lib/card-packs';

	interface Props {
		gameId: string;
		onPacksSelected?: (packs: string[]) => void;
	}

	let { gameId, onPacksSelected }: Props = $props();

	let selectedPacks: SelectedPacks = $state({});
	let showNSFW: boolean = $state(true);
	let showCommunity: boolean = $state(false);
	let cardPacks: CardPack[] = $state([]);
	let isLoadingPacks: boolean = $state(true);
	let loadError: string | null = $state(null);
	let searchQuery: string = $state('');
	let showAllPacks: boolean = $state(false);

	// When starting, show an inline waiting state so the UI reflects
	// the server-driven flow immediately while the parent updates.
	let isStarting: boolean = $state(false);

	// Load card packs on component mount
	$effect(() => {
		loadCardPacks();
	});

	// Reset showAllPacks when search query changes
	$effect(() => {
		if (searchQuery.trim()) {
			showAllPacks = true;
		}
	});

	async function loadCardPacks() {
		try {
			isLoadingPacks = true;
			loadError = null;
			const packs = await getCardPacks();
			cardPacks = packs;

			// Initialize with CAH Base Set selected by default if available
			const basePack = packs.find((pack) => pack.id === 'CAH Base Set');
			if (basePack) {
				selectedPacks[basePack.id] = true;
			}
		} catch (error) {
			console.error('Failed to load card packs:', error);
			loadError = 'Failed to load card packs. Please refresh the page.';
		} finally {
			isLoadingPacks = false;
		}
	}

	$effect(() => {
		// Ensure base game is always selected (can't be deselected)
		const basePack = cardPacks.find((pack) => pack.id === 'CAH Base Set');
		if (basePack && !selectedPacks[basePack.id]) {
			selectedPacks[basePack.id] = true;
		}
	});

	function togglePack(packId: string) {
		const basePack = cardPacks.find((pack) => pack.id === 'CAH Base Set');
		if (basePack && packId === basePack.id) return; // Base game cannot be deselected

		selectedPacks[packId] = !selectedPacks[packId];
	}

	function getFilteredPacks(): CardPack[] {
		let filtered = cardPacks.filter((pack) => {
			if (!showNSFW && pack.isNSFW) return false;
			if (!showCommunity && !pack.isOfficial) return false;
			
			// Apply search filter
			if (searchQuery.trim()) {
				return pack.name.toLowerCase().includes(searchQuery.toLowerCase());
			}
			
			return true;
		});

		// Sort: official first, then alphabetically within each group
		filtered = filtered.sort((a, b) => {
			// First sort by official status (official packs first)
			if (a.isOfficial !== b.isOfficial) {
				return a.isOfficial ? -1 : 1;
			}
			// Then sort alphabetically within each group
			return a.name.localeCompare(b.name);
		});

		// Limit to 6 packs initially unless searching or showAllPacks is true
		if (!searchQuery.trim() && !showAllPacks) {
			filtered = filtered.slice(0, 6);
		}

		return filtered;
	}

	function getSelectedPackIds(): string[] {
		return Object.keys(selectedPacks).filter((id) => selectedPacks[id]);
	}

	function getTotalFilteredPacks(): number {
		return cardPacks.filter((pack) => {
			if (!showNSFW && pack.isNSFW) return false;
			if (!showCommunity && !pack.isOfficial) return false;
			
			// Apply search filter
			if (searchQuery.trim()) {
				return pack.name.toLowerCase().includes(searchQuery.toLowerCase());
			}
			
			return true;
		}).length;
	}

	function startGame() {
		const selectedIds = getSelectedPackIds();
		if (onPacksSelected) {
			onPacksSelected(selectedIds);
			isStarting = true;
		} else {
			// Fallback if no callback provided
			goto(`/play/${gameId}/cards-against-humanity`);
			isStarting = true;
		}
	}

	function goBack() {
		goto('/play/name');
	}

	let filteredPacks = $derived(getFilteredPacks());
	let selectedIds = $derived(getSelectedPackIds());
	let totals = $derived(calculateTotalCards(selectedIds));
	let totalFilteredPacks = $derived(getTotalFilteredPacks());
	let shouldShowMoreButton = $derived(totalFilteredPacks > 6 && !searchQuery.trim() && !showAllPacks);
</script>

<div class="min-h-screen bg-slate-900 text-white">
	<!-- Header -->
	<header class="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700">
		<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-3xl font-bold">Select Card Packs</h1>
					<p class="text-slate-300 mt-1">Choose which card packs to include in your game</p>
				</div>
				<button
					class="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-white font-semibold shadow hover:bg-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 transition"
					onclick={goBack}
				>
					<MdiClose class="h-5 w-5" />
					<span>Cancel</span>
				</button>
			</div>
		</div>
	</header>

	<main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		{#if isStarting}
			<div class="text-center py-8" data-testid="cah-waiting">
				<h1 class="text-3xl font-bold">Select Card Packs</h1>
				<div class="mt-6">
					<div
						class="inline-flex items-center justify-center w-16 h-16 bg-slate-800 rounded-full mb-4"
					>
						<svg
							class="w-8 h-8 text-slate-400 animate-pulse"
							fill="currentColor"
							viewBox="0 0 20 20"
						>
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0 1 1 0 002 0zm-1 4a1 1 0 00-1 1v4a1 1 0 102 0V9a1 1 0 00-1-1z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<h2 class="text-2xl font-bold text-white mb-2">Waiting for Players</h2>
					<p class="text-slate-400 max-w-md mx-auto">
						The game will begin once more players join the room.
					</p>
				</div>
			</div>
		{/if}
		<!-- Filters -->
		<section class="mb-8">
			<div class="flex flex-col gap-4">
				<!-- Search Bar -->
				<div class="relative">
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search card packs..."
						class="w-full px-4 py-3 pl-10 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
					/>
					<svg
						class="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
				</div>
				
				<!-- Filter Checkboxes -->
				<div class="flex flex-wrap gap-4 items-center">
					<div class="flex items-center gap-3">
						<label class="flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								bind:checked={showNSFW}
								class="rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900"
							/>
							<span class="text-sm font-medium">Show NSFW packs</span>
						</label>
					</div>
					<div class="flex items-center gap-3">
						<label class="flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								bind:checked={showCommunity}
								class="rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900"
							/>
							<span class="text-sm font-medium">Show community packs</span>
						</label>
					</div>
				</div>
			</div>
		</section>

		<!-- Loading/Error States -->
		{#if isLoadingPacks}
			<section class="mb-8">
				<div class="text-center py-12">
					<div
						class="inline-flex items-center justify-center w-12 h-12 bg-slate-800 rounded-full mb-4"
					>
						<svg class="w-6 h-6 text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							/>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							/>
						</svg>
					</div>
					<h3 class="text-xl font-bold text-white mb-2">Loading Card Packs</h3>
					<p class="text-slate-400">Fetching available card packs from the server...</p>
				</div>
			</section>
		{:else if loadError}
			<section class="mb-8">
				<div class="text-center py-12">
					<div
						class="inline-flex items-center justify-center w-12 h-12 bg-red-900/20 rounded-full mb-4"
					>
						<svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
							/>
						</svg>
					</div>
					<h3 class="text-xl font-bold text-white mb-2">Failed to Load Card Packs</h3>
					<p class="text-red-400 mb-4">{loadError}</p>
					<button
						class="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-white font-semibold hover:bg-slate-600 transition"
						onclick={loadCardPacks}
					>
						Try Again
					</button>
				</div>
			</section>
		{:else}
			<!-- Card Packs Grid -->
			<section class="mb-8">
				<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#each filteredPacks as pack (pack.id)}
						{@const isSelected = selectedPacks[pack.id]}
						{@const isBaseGame = pack.id === 'Base Set'}

						<button
							class="relative rounded-2xl border transition-all duration-200 cursor-pointer text-left w-full
							{isSelected
								? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20'
								: 'border-slate-700/70 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800/70'}"
							onclick={() => togglePack(pack.id)}
						>
							<div class="p-6">
								<!-- Pack Header -->
								<div class="flex items-start justify-between mb-3">
									<div class="flex-1">
										<div class="flex items-center gap-2 mb-1">
											<h3 class="text-xl font-bold">{pack.name}</h3>
											{#if pack.isOfficial}
												<MdiCrown class="h-5 w-5 text-yellow-500" />
											{/if}
										</div>
										<p class="text-sm text-slate-300">
											{pack.isOfficial ? 'Official' : 'Community'}
										</p>
									</div>
									{#if isSelected}
										<div class="flex-shrink-0 ml-3">
											<div
												class="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center"
											>
												<MdiCheck class="h-4 w-4 text-white" />
											</div>
										</div>
									{/if}
								</div>

								<!-- Pack Description -->
								<p class="text-sm text-slate-400 mb-4 leading-relaxed">
									{pack.isOfficial
										? 'Official Cards Against Humanity pack'
										: 'Community-created card pack'}
								</p>

								<!-- Pack Stats -->
								<div class="flex items-center justify-between text-xs text-slate-500 mb-4">
									<span>{pack.blackCards} black cards</span>
									<span>{pack.whiteCards} white cards</span>
									{#if pack.isNSFW}
										<span class="text-red-400 font-medium">NSFW</span>
									{:else}
										<span class="text-green-400 font-medium">Clean</span>
									{/if}
								</div>

								<!-- Selection Indicator -->
								{#if isBaseGame}
									<div class="text-xs text-emerald-400 font-medium">Required pack</div>
								{/if}
							</div>

							<!-- Hover overlay for non-selected packs -->
							{#if !isSelected && !isBaseGame}
								<div
									class="absolute inset-0 rounded-2xl bg-slate-900/80 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
								>
									<span class="text-sm font-medium text-white">Click to select</span>
								</div>
							{/if}
						</button>
					{/each}
				</div>
				
				<!-- Show More Button -->
				{#if shouldShowMoreButton}
					<div class="flex justify-center mt-6">
						<button
							class="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-6 py-3 text-white font-semibold hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300 transition"
							onclick={() => showAllPacks = true}
						>
							<span>Show More ({totalFilteredPacks - 6} more)</span>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
							</svg>
						</button>
					</div>
				{/if}
			</section>
		{/if}

		<!-- Game Summary & Start -->
		<section class="bg-slate-800/50 rounded-2xl border border-slate-700/70 p-6">
			<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
				<!-- Summary -->
				<div>
					<h3 class="text-lg font-bold mb-2">Game Summary</h3>
					<div class="flex items-center gap-6 text-sm text-slate-300">
						<div class="flex items-center gap-2">
							<MdiAccountGroup class="h-4 w-4" />
							<span>{selectedIds.length} pack{selectedIds.length !== 1 ? 's' : ''} selected</span>
						</div>
						<div>
							<span class="text-slate-400">Total cards:</span>
							<span class="font-medium ml-1"
								>{totals.totalBlack} black, {totals.totalWhite} white</span
							>
						</div>
					</div>
				</div>

				<!-- Start Button -->
				<div class="flex-shrink-0">
					<button
						class="group inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-white font-semibold shadow hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
						onclick={startGame}
						disabled={selectedIds.length === 0}
					>
						<span>Start Game</span>
					</button>
				</div>
			</div>
		</section>
	</main>
</div>

<style>
	/* Custom scrollbar for webkit browsers */
	::-webkit-scrollbar {
		width: 8px;
	}

	::-webkit-scrollbar-track {
		background: rgb(51 65 85 / 0.5);
		border-radius: 4px;
	}

	::-webkit-scrollbar-thumb {
		background: rgb(100 116 139);
		border-radius: 4px;
	}

	::-webkit-scrollbar-thumb:hover {
		background: rgb(148 163 184);
	}
</style>
