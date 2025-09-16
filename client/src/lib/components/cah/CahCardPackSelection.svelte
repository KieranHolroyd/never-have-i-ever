<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import MdiCheck from '~icons/mdi/check';
	import MdiClose from '~icons/mdi/close';
	import MdiCrown from '~icons/mdi/crown';
	import MdiAccountGroup from '~icons/mdi/account-group';
	import type { CardPack, SelectedPacks } from '$lib/types';
	import { FAKE_CARD_PACKS, calculateTotalCards } from '$lib/card-packs';

	interface Props {
		gameId: string;
		onPacksSelected?: (packs: string[]) => void;
	}

	let { gameId, onPacksSelected }: Props = $props();

	let selectedPacks: SelectedPacks = $state({});
	let showNSFW: boolean = $state(true);
	let showCommunity: boolean = $state(true);

// When starting, show an inline waiting state so the UI reflects
// the server-driven flow immediately while the parent updates.
let isStarting: boolean = $state(false);

	// Initialize with base game selected by default
	selectedPacks = { 'base-game': true };

	$effect(() => {
		// Ensure base game is always selected (can't be deselected)
		if (!selectedPacks['base-game']) {
			selectedPacks['base-game'] = true;
		}
	});

	function togglePack(packId: string) {
		if (packId === 'base-game') return; // Base game cannot be deselected

		selectedPacks[packId] = !selectedPacks[packId];
	}

	function getFilteredPacks(): CardPack[] {
		return FAKE_CARD_PACKS.filter((pack) => {
			if (!showNSFW && pack.isNSFW) return false;
			if (!showCommunity && !pack.isOfficial) return false;
			return true;
		});
	}

	function getSelectedPackIds(): string[] {
		return Object.keys(selectedPacks).filter((id) => selectedPacks[id]);
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
                <div class="inline-flex items-center justify-center w-16 h-16 bg-slate-800 rounded-full mb-4">
                    <svg class="w-8 h-8 text-slate-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0 1 1 0 002 0zm-1 4a1 1 0 00-1 1v4a1 1 0 102 0V9a1 1 0 00-1-1z" clip-rule="evenodd"/>
                    </svg>
                </div>
                <h2 class="text-2xl font-bold text-white mb-2">Waiting for Players</h2>
                <p class="text-slate-400 max-w-md mx-auto">The game will begin once more players join the room.</p>
            </div>
        </div>
    {/if}
		<!-- Filters -->
		<section class="mb-8">
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
		</section>

		<!-- Card Packs Grid -->
		<section class="mb-8">
			<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each filteredPacks as pack}
					{@const isSelected = selectedPacks[pack.id]}
					{@const isBaseGame = pack.id === 'base-game'}

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
									<p class="text-sm text-slate-300">by {pack.author}</p>
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
								{pack.description}
							</p>

							<!-- Pack Stats -->
							<div class="flex items-center justify-between text-xs text-slate-500 mb-4">
								<span>{pack.metadata.totalBlackCards} black cards</span>
								<span>{pack.metadata.totalWhiteCards} white cards</span>
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
		</section>

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
