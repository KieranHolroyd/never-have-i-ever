<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import MdiCheck from '~icons/mdi/check';
	import MdiClose from '~icons/mdi/close';
	import MdiCrown from '~icons/mdi/crown';
	import MdiAccountGroup from '~icons/mdi/account-group';
	import type { CardPack, SelectedPacks } from '$lib/types';
	import { getCardPacks, calculateTotalCards } from '$lib/card-packs';
	import posthog from 'posthog-js';

	const BASE_PACK_ID = 'CAH Base Set';

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

	onMount(() => {
		loadCardPacks();
	});

	async function loadCardPacks() {
		try {
			isLoadingPacks = true;
			loadError = null;
			const packs = await getCardPacks();
			cardPacks = packs;

			// Initialize with CAH Base Set selected by default if available
			const basePack = packs.find((pack) => pack.id === BASE_PACK_ID);
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

	function togglePack(packId: string) {
		const basePack = cardPacks.find((pack) => pack.id === BASE_PACK_ID);
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
		const currentTotals = calculateTotalCards(selectedIds);
		posthog.capture('cah_packs_selected', {
			pack_count: selectedIds.length,
			pack_ids: selectedIds,
			total_black_cards: currentTotals.totalBlack,
			total_white_cards: currentTotals.totalWhite
		});
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
	let shouldShowMoreButton = $derived(
		totalFilteredPacks > 6 && !searchQuery.trim() && !showAllPacks
	);
	let selectedPackList = $derived(cardPacks.filter((pack) => selectedIds.includes(pack.id)));
</script>

<div
	class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.12),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_55%,#020617_100%)] text-white"
>
	<header class="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl">
		<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<div>
					<p class="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
						Cards Against Humanity
					</p>
					<h1 class="mt-2 text-3xl font-bold text-white sm:text-4xl">Build the table’s card mix</h1>
					<p class="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
						Choose a base of official packs, then widen the tone with NSFW or community decks. The
						summary stays visible so you can see the game size before starting.
					</p>
				</div>
				<button
					class="inline-flex items-center gap-2 self-start rounded-xl border border-slate-700/70 bg-slate-900/80 px-4 py-2.5 text-sm font-semibold text-white shadow hover:border-slate-600 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 transition"
					onclick={goBack}
				>
					<MdiClose class="h-5 w-5" />
					<span>Cancel</span>
				</button>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 lg:px-8 lg:pb-8">
		{#if isStarting}
			<section
				class="rounded-[32px] border border-slate-700/70 bg-slate-900/75 px-6 py-10 text-center shadow-[0_25px_80px_rgba(2,6,23,0.5)] ring-1 ring-white/5 backdrop-blur-xl"
				data-testid="cah-waiting"
			>
				<h1 class="text-3xl font-bold">Starting game</h1>
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
					<h2 class="text-2xl font-bold text-white mb-2">Waiting for players</h2>
					<p class="text-slate-400 max-w-md mx-auto">
						The selected packs are being sent to the server. The room will open as soon as the table
						is ready.
					</p>
				</div>
			</section>
		{/if}

		<div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
			<div class="space-y-6">
				<section
					class="rounded-[28px] border border-slate-700/70 bg-slate-900/75 p-5 shadow-xl ring-1 ring-white/5 backdrop-blur-sm sm:p-6"
				>
					<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
						<div class="space-y-4">
							<div class="relative">
								<input
									type="text"
									bind:value={searchQuery}
									placeholder="Search card packs..."
									class="w-full rounded-2xl border border-slate-700/70 bg-slate-950/80 px-4 py-3 pl-11 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
								/>
								<svg
									class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
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

							<div class="flex flex-wrap gap-3">
								<label
									class="inline-flex items-center gap-3 rounded-full border border-slate-700/70 bg-slate-950/70 px-4 py-2 text-sm font-medium text-slate-200 cursor-pointer transition-colors hover:border-slate-600"
								>
									<input
										type="checkbox"
										bind:checked={showNSFW}
										class="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900"
									/>
									<span>Show NSFW packs</span>
								</label>
								<label
									class="inline-flex items-center gap-3 rounded-full border border-slate-700/70 bg-slate-950/70 px-4 py-2 text-sm font-medium text-slate-200 cursor-pointer transition-colors hover:border-slate-600"
								>
									<input
										type="checkbox"
										bind:checked={showCommunity}
										class="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900"
									/>
									<span>Show community packs</span>
								</label>
							</div>
						</div>

						<div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
							<div class="rounded-2xl border border-slate-700/70 bg-slate-950/70 px-4 py-3">
								<div class="text-xs uppercase tracking-[0.22em] text-slate-500">Visible packs</div>
								<div class="mt-2 text-2xl font-semibold text-white">{totalFilteredPacks}</div>
							</div>
							<div class="rounded-2xl border border-slate-700/70 bg-slate-950/70 px-4 py-3">
								<div class="text-xs uppercase tracking-[0.22em] text-slate-500">Selected</div>
								<div class="mt-2 text-2xl font-semibold text-white">{selectedIds.length}</div>
							</div>
							<div class="rounded-2xl border border-slate-700/70 bg-slate-950/70 px-4 py-3">
								<div class="text-xs uppercase tracking-[0.22em] text-slate-500">Deck size</div>
								<div class="mt-2 text-2xl font-semibold text-white">
									{totals.totalWhite + totals.totalBlack}
								</div>
							</div>
						</div>
					</div>
				</section>

				{#if isLoadingPacks}
					<section
						class="rounded-[28px] border border-slate-700/70 bg-slate-900/75 p-8 text-center shadow-xl ring-1 ring-white/5 backdrop-blur-sm"
					>
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
						<h3 class="text-xl font-bold text-white mb-2">Loading card packs</h3>
						<p class="text-slate-400">Fetching available card packs from the server...</p>
					</section>
				{:else if loadError}
					<section
						class="rounded-[28px] border border-red-500/20 bg-red-950/20 p-8 text-center shadow-xl ring-1 ring-white/5 backdrop-blur-sm"
					>
						<div
							class="inline-flex items-center justify-center w-12 h-12 bg-red-900/20 rounded-full mb-4"
						>
							<svg
								class="w-6 h-6 text-red-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
								/>
							</svg>
						</div>
						<h3 class="text-xl font-bold text-white mb-2">Failed to load card packs</h3>
						<p class="text-red-300 mb-4">{loadError}</p>
						<button
							class="inline-flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2 text-white font-semibold hover:bg-slate-600 transition"
							onclick={loadCardPacks}
						>
							Try again
						</button>
					</section>
				{:else}
					<section
						class="rounded-[28px] border border-slate-700/70 bg-slate-900/75 p-5 shadow-xl ring-1 ring-white/5 backdrop-blur-sm sm:p-6"
					>
						<div class="mb-5 flex items-center justify-between gap-3">
							<div>
								<h2 class="text-xl font-semibold text-white">Available packs</h2>
								<p class="mt-1 text-sm text-slate-400">
									Official packs stay first so the baseline game is easy to keep clean and readable.
								</p>
							</div>
							{#if searchQuery.trim()}
								<div
									class="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200"
								>
									Searching
								</div>
							{/if}
						</div>

						<div class="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
							{#each filteredPacks as pack (pack.id)}
								{@const isSelected = selectedPacks[pack.id]}
								{@const isBaseGame = pack.id === BASE_PACK_ID}

								<button
									class="relative flex h-full min-h-[15.5rem] flex-col rounded-[24px] border transition-all duration-200 cursor-pointer text-left w-full
							{isSelected
										? 'border-cyan-400 bg-cyan-500/10 ring-2 ring-cyan-400/25 shadow-[0_18px_50px_rgba(34,211,238,0.12)]'
										: 'border-slate-700/70 bg-slate-950/70 hover:-translate-y-0.5 hover:border-slate-600 hover:bg-slate-900'}"
									onclick={() => togglePack(pack.id)}
								>
									<div class="flex h-full flex-col p-5">
										<div class="flex items-start justify-between gap-3 mb-3">
											<div class="flex-1">
												<div class="flex items-center gap-2 mb-1">
													<h3 class="text-lg font-bold text-white">{pack.name}</h3>
													{#if pack.isOfficial}
														<MdiCrown class="h-5 w-5 text-yellow-500" />
													{/if}
												</div>
												<p class="text-sm text-slate-400">
													{pack.isOfficial ? 'Official' : 'Community'}
												</p>
											</div>
											{#if isSelected}
												<div class="flex-shrink-0 ml-3">
													<div
														class="w-7 h-7 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg"
													>
														<MdiCheck class="h-4 w-4 text-white" />
													</div>
												</div>
											{/if}
										</div>

										<p class="text-sm text-slate-300 mb-5 leading-relaxed">
											{pack.isOfficial
												? 'Official Cards Against Humanity pack'
												: 'Community-created card pack'}
										</p>

										<div class="mt-auto grid grid-cols-2 gap-3 text-sm text-slate-300">
											<div class="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2">
												<div class="text-[11px] uppercase tracking-[0.2em] text-slate-500">
													Black
												</div>
												<div class="mt-1 font-semibold text-white">{pack.blackCards}</div>
											</div>
											<div class="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2">
												<div class="text-[11px] uppercase tracking-[0.2em] text-slate-500">
													White
												</div>
												<div class="mt-1 font-semibold text-white">{pack.whiteCards}</div>
											</div>
										</div>

										<div
											class="mt-4 flex items-center justify-between text-xs font-medium text-slate-400"
										>
											{#if pack.isNSFW}
												<span
													class="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-red-300"
													>NSFW</span
												>
											{:else}
												<span
													class="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-300"
													>Clean</span
												>
											{/if}

											{#if isBaseGame}
												<span
													class="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-cyan-200"
													>Required pack</span
												>
											{:else if isSelected}
												<span class="text-cyan-200">Selected</span>
											{:else}
												<span class="text-slate-500">Tap to select</span>
											{/if}
										</div>
									</div>
								</button>
							{/each}
						</div>

						{#if shouldShowMoreButton}
							<div class="mt-6 flex justify-center">
								<button
									class="inline-flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-950/70 px-6 py-3 text-white font-semibold hover:border-slate-600 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 transition"
									onclick={() => (showAllPacks = true)}
								>
									<span>Show more ({totalFilteredPacks - 6})</span>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M19 9l-7 7-7-7"
										/>
									</svg>
								</button>
							</div>
						{/if}
					</section>
				{/if}
			</div>

			<aside class="hidden xl:block xl:sticky xl:top-6 xl:self-start">
				<section
					class="rounded-[28px] border border-slate-700/70 bg-slate-900/80 p-5 shadow-xl ring-1 ring-white/5 backdrop-blur-sm"
				>
					<p class="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
						Game Summary
					</p>
					<h2 class="mt-2 text-2xl font-semibold text-white">Ready the deck</h2>
					<p class="mt-2 text-sm text-slate-400">
						Keep an eye on the total card pool so the round pacing feels right for the table.
					</p>

					<div class="mt-5 grid gap-3">
						<div class="rounded-2xl border border-slate-700/70 bg-slate-950/70 px-4 py-3">
							<div class="flex items-center gap-2 text-sm text-slate-300">
								<MdiAccountGroup class="h-4 w-4" />
								<span>{selectedIds.length} pack{selectedIds.length !== 1 ? 's' : ''} selected</span>
							</div>
						</div>
						<div class="grid grid-cols-2 gap-3">
							<div class="rounded-2xl border border-slate-700/70 bg-slate-950/70 px-4 py-3">
								<div class="text-xs uppercase tracking-[0.22em] text-slate-500">Black cards</div>
								<div class="mt-2 text-xl font-semibold text-white">{totals.totalBlack}</div>
							</div>
							<div class="rounded-2xl border border-slate-700/70 bg-slate-950/70 px-4 py-3">
								<div class="text-xs uppercase tracking-[0.22em] text-slate-500">White cards</div>
								<div class="mt-2 text-xl font-semibold text-white">{totals.totalWhite}</div>
							</div>
						</div>
					</div>

					<div class="mt-5">
						<div class="mb-3 text-sm font-semibold text-white">Selected packs</div>
						<div class="space-y-2">
							{#each selectedPackList.slice(0, 6) as pack (pack.id)}
								<div
									class="flex items-center justify-between rounded-2xl border border-slate-700/70 bg-slate-950/70 px-4 py-3"
								>
									<div class="min-w-0 pr-3">
										<div class="truncate text-sm font-medium text-white">{pack.name}</div>
										<div class="text-xs text-slate-500">
											{pack.isOfficial ? 'Official' : 'Community'}
										</div>
									</div>
									<div class="text-xs font-semibold text-slate-300">
										{pack.blackCards + pack.whiteCards}
									</div>
								</div>
							{/each}
							{#if selectedPackList.length > 6}
								<div
									class="rounded-2xl border border-slate-700/70 bg-slate-950/50 px-4 py-3 text-sm text-slate-400"
								>
									+ {selectedPackList.length - 6} more pack{selectedPackList.length - 6 === 1
										? ''
										: 's'}
								</div>
							{/if}
						</div>
					</div>

					<button
						class="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-500 px-6 py-3 text-white font-semibold shadow-lg hover:from-emerald-500 hover:to-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
						onclick={startGame}
						disabled={selectedIds.length === 0}
					>
						<span>Start game</span>
					</button>
				</section>
			</aside>
		</div>

		<div class="sticky bottom-3 z-20 xl:hidden">
			<section
				class="rounded-[24px] border border-slate-700/70 bg-slate-950/95 p-4 shadow-[0_18px_50px_rgba(2,6,23,0.65)] ring-1 ring-white/5 backdrop-blur-sm"
			>
				<div class="flex items-center justify-between gap-4">
					<div>
						<div class="text-sm font-semibold text-white">
							{selectedIds.length} pack{selectedIds.length !== 1 ? 's' : ''} selected
						</div>
						<div class="text-sm text-slate-400">
							{totals.totalBlack} black and {totals.totalWhite} white cards ready
						</div>
					</div>
					<button
						class="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-emerald-500 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
						onclick={startGame}
						disabled={selectedIds.length === 0}
					>
						Start game
					</button>
				</div>
			</section>
		</div>
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
