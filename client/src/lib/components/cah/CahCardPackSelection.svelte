<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import MdiCheck from '~icons/mdi/check';
	import MdiClose from '~icons/mdi/close';
	import MdiCrown from '~icons/mdi/crown';
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
		if (selectedIds.length === 0) {
			loadError = 'Please select at least one card pack to continue.';
			return;
		}
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

<div class="min-h-screen bg-[#111111] text-white">
	<!-- Sticky header — matches CahGame.svelte -->
	<header
		class="sticky top-0 z-30 border-b border-white/[0.07] bg-[#111111]/96 backdrop-blur-md px-4 py-3 sm:px-6 lg:px-8"
	>
		<div class="flex items-center justify-between gap-4">
			<div>
				<span class="text-[11px] font-black uppercase tracking-[0.35em] text-white/25"
					>Cards Against Humanity</span
				>
				<h1 class="mt-0.5 text-lg font-black text-white">Choose your card packs</h1>
			</div>
			<button
				class="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-bold text-white/50 transition hover:bg-white/[0.08] hover:text-white/80"
				onclick={goBack}
			>
				<MdiClose class="h-4 w-4" />
				Cancel
			</button>
		</div>
	</header>

	{#if isStarting}
		<!-- Full-page starting state -->
		<div class="p-4 sm:p-6 lg:p-8">
			<div
				class="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-8 text-center"
				data-testid="cah-waiting"
			>
				<div
					class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.05]"
				>
					<svg class="h-7 w-7 animate-pulse text-white/30" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0 1 1 0 002 0zm-1 4a1 1 0 00-1 1v4a1 1 0 102 0V9a1 1 0 00-1-1z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
				<p class="text-[11px] font-black uppercase tracking-[0.3em] text-white/25">Starting</p>
				<h2 class="mt-2 text-2xl font-black text-white">Waiting for players</h2>
				<p class="mt-2 text-sm text-white/40">
					Packs sent to server. Room opens when the table is ready.
				</p>
			</div>
		</div>
	{:else}
		<!-- Two-column layout — matches CahGame.svelte -->
		<div class="flex items-start gap-6 p-4 sm:p-6 lg:p-8">
			<!-- Main content -->
			<div class="min-w-0 flex-1 space-y-4 pb-28 lg:pb-4">
				<!-- Search + filters -->
				<div class="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-4">
					<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
						<div class="relative flex-1">
							<input
								type="text"
								bind:value={searchQuery}
								placeholder="Search card packs…"
								class="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 pl-9 text-sm text-white placeholder-white/20 focus:border-white/30 focus:outline-none"
							/>
							<svg
								class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20"
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
						<div class="flex items-center gap-2">
							<label
								class="inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold transition-colors
								{showNSFW
									? 'border-white/20 bg-white/[0.08] text-white'
									: 'border-white/[0.07] text-white/35 hover:border-white/15'}"
							>
								<input type="checkbox" bind:checked={showNSFW} class="sr-only" />
								NSFW
							</label>
							<label
								class="inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold transition-colors
								{showCommunity
									? 'border-white/20 bg-white/[0.08] text-white'
									: 'border-white/[0.07] text-white/35 hover:border-white/15'}"
							>
								<input type="checkbox" bind:checked={showCommunity} class="sr-only" />
								Community
							</label>
						</div>
					</div>
				</div>

				<!-- Stats row -->
				<div class="grid grid-cols-3 gap-3">
					<div class="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] px-4 py-3">
						<p class="text-[10px] font-black uppercase tracking-[0.25em] text-white/25">Visible</p>
						<p class="mt-1 text-2xl font-black text-white">{totalFilteredPacks}</p>
					</div>
					<div class="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] px-4 py-3">
						<p class="text-[10px] font-black uppercase tracking-[0.25em] text-white/25">Selected</p>
						<p class="mt-1 text-2xl font-black text-white">{selectedIds.length}</p>
					</div>
					<div class="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] px-4 py-3">
						<p class="text-[10px] font-black uppercase tracking-[0.25em] text-white/25">Cards</p>
						<p class="mt-1 text-2xl font-black text-white">{totals.totalWhite + totals.totalBlack}</p>
					</div>
				</div>

				<!-- Loading / error / pack grid -->
				{#if isLoadingPacks}
					<div class="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-8 text-center">
						<svg
							class="mx-auto mb-4 h-8 w-8 animate-spin text-white/30"
							fill="none"
							viewBox="0 0 24 24"
						>
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
						<p class="text-sm font-bold text-white/40">Loading card packs…</p>
					</div>
				{:else if loadError}
					<div class="rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-8 text-center">
						<p class="text-[11px] font-black uppercase tracking-[0.3em] text-red-400/60">Error</p>
						<h3 class="mt-2 text-xl font-black text-white">Failed to load packs</h3>
						<p class="mt-1 text-sm text-white/40">{loadError}</p>
						<button
							class="mt-4 rounded-xl border border-white/10 bg-white/[0.05] px-5 py-2.5 text-sm font-bold text-white/70 transition hover:bg-white/[0.08]"
							onclick={loadCardPacks}
						>
							Try again
						</button>
					</div>
				{:else}
					<!-- Pack grid -->
					<div class="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-4 sm:p-5">
						<div class="mb-4 flex items-center justify-between gap-3">
							<div>
								<p class="text-[11px] font-black uppercase tracking-[0.3em] text-white/25">Packs</p>
								<h2 class="mt-0.5 text-lg font-black text-white">Available packs</h2>
							</div>
							{#if searchQuery.trim()}
								<div
									class="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-bold text-white/50"
								>
									Searching
								</div>
							{/if}
						</div>

						<div class="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
							{#each filteredPacks as pack (pack.id)}
								{@const isSelected = selectedPacks[pack.id]}
								{@const isBaseGame = pack.id === BASE_PACK_ID}
								<button
									class="relative flex h-full min-h-[13rem] w-full cursor-pointer flex-col rounded-xl border text-left transition-all duration-150
									{isSelected
										? 'border-white/30 bg-white/[0.06] shadow-[0_4px_20px_rgba(255,255,255,0.07)]'
										: 'border-white/[0.07] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]'}"
									onclick={() => togglePack(pack.id)}
								>
									<div class="flex h-full flex-col p-4">
										<div class="mb-2 flex items-start justify-between gap-3">
											<div class="flex-1">
												<div class="mb-0.5 flex items-center gap-1.5">
													<h3 class="text-sm font-black leading-tight text-white">{pack.name}</h3>
													{#if pack.isOfficial}
														<MdiCrown class="h-3.5 w-3.5 shrink-0 text-amber-400/70" />
													{/if}
												</div>
												<p class="text-[11px] text-white/30">
													{pack.isOfficial ? 'Official' : 'Community'}
												</p>
											</div>
											{#if isSelected}
												<div class="shrink-0">
													<div
														class="flex h-5 w-5 items-center justify-center rounded-full bg-white"
													>
														<MdiCheck class="h-3 w-3 text-black" />
													</div>
												</div>
											{/if}
										</div>

										<div class="mt-auto grid grid-cols-2 gap-2">
											<div class="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
												<div
													class="text-[10px] font-black uppercase tracking-[0.2em] text-white/25"
												>
													Black
												</div>
												<div class="mt-0.5 font-black text-white">{pack.blackCards}</div>
											</div>
											<div class="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
												<div
													class="text-[10px] font-black uppercase tracking-[0.2em] text-white/25"
												>
													White
												</div>
												<div class="mt-0.5 font-black text-white">{pack.whiteCards}</div>
											</div>
										</div>

										<div class="mt-3 flex items-center justify-between text-[11px]">
											{#if pack.isNSFW}
												<span
													class="rounded-full border border-red-500/15 bg-red-500/[0.08] px-2 py-0.5 font-bold text-red-400/80"
													>NSFW</span
												>
											{:else}
												<span
													class="rounded-full border border-green-500/15 bg-green-500/[0.08] px-2 py-0.5 font-bold text-green-400/80"
													>Clean</span
												>
											{/if}
											{#if isBaseGame}
												<span class="font-bold text-white/25">Required</span>
											{:else if isSelected}
												<span class="font-bold text-white/60">Selected</span>
											{:else}
												<span class="text-white/20">Tap to add</span>
											{/if}
										</div>
									</div>
								</button>
							{/each}
						</div>

						{#if shouldShowMoreButton}
							<div class="mt-5 flex justify-center">
								<button
									class="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-5 py-2.5 text-sm font-bold text-white/50 transition hover:bg-white/[0.08] hover:text-white/70"
									onclick={() => (showAllPacks = true)}
								>
									Show {totalFilteredPacks - 6} more
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
					</div>
				{/if}
			</div>

			<!-- Desktop sidebar — matches CahPlayerList style -->
			<aside
				class="hidden w-72 shrink-0 lg:sticky lg:top-[3.5rem] lg:block lg:self-start xl:w-80"
			>
				<div class="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#1a1a1a]">
					<!-- Header -->
					<div class="border-b border-white/[0.07] px-4 py-3">
						<span class="text-[11px] font-black uppercase tracking-[0.3em] text-white/30"
							>Deck summary</span
						>
					</div>

					<!-- Black / White counts -->
					<div class="grid grid-cols-2 divide-x divide-white/[0.05] border-b border-white/[0.05]">
						<div class="px-4 py-3">
							<p class="text-[10px] font-black uppercase tracking-[0.2em] text-white/25">Black</p>
							<p class="mt-1 text-2xl font-black text-white">{totals.totalBlack}</p>
						</div>
						<div class="px-4 py-3">
							<p class="text-[10px] font-black uppercase tracking-[0.2em] text-white/25">White</p>
							<p class="mt-1 text-2xl font-black text-white">{totals.totalWhite}</p>
						</div>
					</div>

					<!-- Selected pack list -->
					{#if selectedPackList.length > 0}
						<div class="divide-y divide-white/[0.05]">
							{#each selectedPackList.slice(0, 8) as pack (pack.id)}
								<div class="flex items-center justify-between px-4 py-2.5">
									<div class="min-w-0 pr-2">
										<p class="truncate text-sm font-bold text-white/80">{pack.name}</p>
										<p class="text-[11px] text-white/30">
											{pack.blackCards + pack.whiteCards} cards
										</p>
									</div>
									{#if pack.isOfficial}
										<MdiCrown class="h-3.5 w-3.5 shrink-0 text-amber-400/40" />
									{/if}
								</div>
							{/each}
							{#if selectedPackList.length > 8}
								<div class="px-4 py-2.5 text-sm text-white/25">
									+{selectedPackList.length - 8} more
								</div>
							{/if}
						</div>
					{:else}
						<div class="px-4 py-5 text-center">
							<p class="text-sm text-white/25">No packs selected</p>
						</div>
					{/if}

					<!-- Start button -->
					<div class="border-t border-white/[0.07] p-4">
						<button
							class="w-full rounded-xl bg-white px-6 py-3 text-sm font-black text-black transition-all hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-30"
							onclick={startGame}
							disabled={selectedIds.length === 0}
						>
							Start game
						</button>
					</div>
				</div>
			</aside>
		</div>

		<!-- Mobile sticky bottom bar -->
		<div class="sticky bottom-3 z-20 px-4 lg:hidden">
			<div class="rounded-2xl border border-white/10 bg-[#111111]/95 p-4 shadow-2xl backdrop-blur-md">
				<div class="flex items-center justify-between gap-4">
					<div>
						<p class="text-sm font-bold text-white">
							{selectedIds.length} pack{selectedIds.length !== 1 ? 's' : ''}
						</p>
						<p class="text-xs text-white/35">{totals.totalBlack}B / {totals.totalWhite}W cards</p>
					</div>
					<button
						class="rounded-xl bg-white px-6 py-3 text-sm font-black text-black transition-all hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-30"
						onclick={startGame}
						disabled={selectedIds.length === 0}
					>
						Start game
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
