<script lang="ts">
	import type { CAHPlayer } from '$lib/types';

	interface Props {
		currentPlayer: CAHPlayer;
		selectedCardIds: string[];
		onCardSelect: (cardId: string) => void;
		onSubmitCards: (cardIds: string[]) => void;
		onClearSelection: () => void;
		requiredCards: number;
	}

	let {
		currentPlayer,
		selectedCardIds,
		onCardSelect,
		onSubmitCards,
		onClearSelection,
		requiredCards
	}: Props = $props();

	const isSelectionComplete = selectedCardIds.length === requiredCards;
</script>

<div class="mb-6">
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-3">
			<h3 class="text-xl font-semibold">Your Hand</h3>
			<div class="flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-full text-sm text-blue-400 font-medium">
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
					<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
				</svg>
				{currentPlayer.hand.length} cards
			</div>
		</div>
		<div class="text-sm text-slate-400">
			Selected: {selectedCardIds.length} / {requiredCards}
		</div>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
		{#each currentPlayer.hand as card, index}
			<button
				class="group relative rounded-lg p-4 transition-all duration-200 text-left w-full border-2 overflow-hidden
				{selectedCardIds.includes(card.id)
					? 'bg-emerald-100 text-emerald-900 border-emerald-400 shadow-lg transform scale-105'
					: 'bg-white text-black hover:bg-gray-50 border-gray-300 hover:border-gray-400 hover:shadow-md'}"
				onclick={() => onCardSelect(card.id)}
				style="animation-delay: {index * 50}ms"
			>

				<!-- Selection Indicator -->
				{#if selectedCardIds.includes(card.id)}
					<div class="absolute top-2 right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
						<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 101.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
						</svg>
					</div>
				{/if}

				<!-- Card Content -->
				<div class="flex items-start gap-3">
					<div class="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0">
						<span class="text-xs font-bold text-white">{index + 1}</span>
					</div>
					<p class="text-sm leading-relaxed group-hover:text-gray-800 transition-colors">
						{card.text}
					</p>
				</div>

				<!-- Hover Effect -->
				<div class="absolute inset-0 bg-gradient-to-r from-emerald-400/0 to-emerald-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg"></div>
			</button>
		{/each}
	</div>

	<!-- Action Bar -->
	<div class="bg-slate-800/50 rounded-lg p-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-4">
				<div class="text-sm text-slate-400">
					Progress: {selectedCardIds.length} of {requiredCards} selected
				</div>
				{#if isSelectionComplete}
					<div class="flex items-center gap-2 text-sm text-green-400">
						<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
						</svg>
						Ready to submit!
					</div>
				{:else if selectedCardIds.length > 0}
					<div class="flex items-center gap-2 text-sm text-blue-400">
						<svg class="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0 1 1 0 002 0zm-1 4a1 1 0 00-1 1v4a1 1 0 102 0V9a1 1 0 00-1-1z" clip-rule="evenodd"/>
						</svg>
						{selectedCardIds.length} selected
					</div>
				{/if}
			</div>

			<div class="flex items-center gap-3">
				{#if selectedCardIds.length > 0}
					<button
						class="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-white text-sm font-medium transition-colors duration-200"
						onclick={onClearSelection}
					>
						<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clip-rule="evenodd"/>
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
						</svg>
						Clear All
					</button>
				{/if}

				<button
					class="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 rounded-lg text-white text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
					onclick={() => onSubmitCards(selectedCardIds)}
					disabled={!isSelectionComplete}
				>
					<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
					</svg>
					Submit Cards
				</button>
			</div>
		</div>
	</div>
</div>