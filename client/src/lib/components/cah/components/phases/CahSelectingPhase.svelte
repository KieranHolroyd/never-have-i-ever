<script lang="ts">
	import type { CAHGameState, CAHPlayer } from '$lib/types';

	interface Props {
		currentPlayer: CAHPlayer;
		gameState: CAHGameState;
		hasSubmitted: boolean;
		selectedCardIds: string[];
		onCardSelect: (cardId: string) => void;
		onSubmitCards: (cardIds: string[]) => void;
		onClearSelection: () => void;
		requiredCards: number;
	}

	let {
		currentPlayer,
		gameState,
		hasSubmitted,
		selectedCardIds,
		onCardSelect,
		onSubmitCards,
		onClearSelection,
		requiredCards
	}: Props = $props();

	const isSelectionComplete = $derived(selectedCardIds.length === requiredCards);
	const nonJudges = $derived(gameState.players.filter((p) => p.connected && !p.isJudge));
	const submittedCount = $derived(gameState.submittedCards?.length ?? 0);
	const selectedCards = $derived(
		selectedCardIds
			.map((cardId) => currentPlayer.hand.find((card) => card.id === cardId))
			.filter((card) => card !== undefined)
	);
</script>

<div class="space-y-4">
	{#if hasSubmitted}
		<!-- Submitted state -->
		<div class="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-5">
			<div class="flex items-start justify-between gap-4">
				<div>
					<p class="text-[11px] font-black uppercase tracking-[0.3em] text-white/30">Hand locked</p>
					<h3 class="mt-1.5 text-xl font-black text-white">Waiting for the table</h3>
					<p class="mt-1 text-sm text-white/40">
						{submittedCount} of {nonJudges.length} players have submitted.
					</p>
				</div>
				<div
					class="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm font-bold text-white/50"
				>
					{submittedCount}/{nonJudges.length}
				</div>
			</div>
			<!-- Progress bar -->
			<div class="mt-4 h-[3px] overflow-hidden rounded-full bg-white/10">
				<div
					class="h-[3px] rounded-full bg-white transition-all duration-500"
					style="width: {nonJudges.length > 0
						? Math.round((submittedCount / nonJudges.length) * 100)
						: 0}%"
				></div>
			</div>
		</div>
	{:else}
		<!-- Status bar -->
		<div class="flex items-center justify-between">
			<div>
				<p class="text-[11px] font-black uppercase tracking-[0.3em] text-white/30">Your hand</p>
				<h3 class="mt-0.5 text-lg font-black text-white">
					Choose {requiredCards} card{requiredCards === 1 ? '' : 's'}
				</h3>
			</div>
			<div class="flex items-center gap-3">
				{#if selectedCardIds.length > 0}
					<button
						class="text-sm font-bold text-white/30 hover:text-white/60 transition-colors"
						onclick={onClearSelection}
					>
						Clear
					</button>
				{/if}
				<div
					class="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm font-black text-white"
				>
					{selectedCardIds.length}/{requiredCards}
				</div>
			</div>
		</div>

		<!-- Selection preview -->
		{#if selectedCards.length > 0}
			<div class="flex gap-2 overflow-x-auto pb-1">
				{#each selectedCards as card, index (card.id)}
					<div
						class="min-w-[11rem] rounded-xl border border-white bg-white p-3 shadow-[0_4px_20px_rgba(255,255,255,0.12)]"
					>
						<div class="mb-1 text-[10px] font-black uppercase tracking-[0.25em] text-black/30">
							Play #{index + 1}
						</div>
						<p class="text-xs font-bold leading-relaxed text-black">{card.text}</p>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Card grid -->
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
			{#each currentPlayer.hand as card, index (card.id)}
				{@const isSelected = selectedCardIds.includes(card.id)}
				{@const selectionOrder = selectedCardIds.indexOf(card.id) + 1}
				<button
					class="group relative min-h-[9rem] overflow-hidden rounded-xl border p-4 text-left transition-all duration-150
					{isSelected
						? 'border-white bg-white text-black shadow-[0_6px_30px_rgba(255,255,255,0.15)] -translate-y-1'
						: 'border-white/10 bg-white text-black shadow-md hover:-translate-y-0.5 hover:shadow-xl'}"
					onclick={() => onCardSelect(card.id)}
				>
					{#if isSelected}
						<div
							class="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-black text-white"
						>
							{selectionOrder}
						</div>
					{/if}
					<p class="pr-7 text-sm font-bold leading-snug text-black">{card.text}</p>
					<div
						class="absolute bottom-3 left-4 text-[10px] font-black uppercase tracking-[0.25em] text-black/20"
					>
						{isSelected ? 'selected' : 'tap to play'}
					</div>
				</button>
			{/each}
		</div>

		<!-- Submit bar -->
		<div class="sticky bottom-3 z-10">
			<div class="rounded-2xl border border-white/[0.07] bg-[#111111]/95 p-4 backdrop-blur-sm">
				<div class="flex items-center justify-between gap-4">
					<p class="text-sm text-white/40">
						{#if isSelectionComplete}
							Ready — lock in your answer
						{:else}
							Pick {requiredCards - selectedCardIds.length} more card{requiredCards -
								selectedCardIds.length ===
							1
								? ''
								: 's'}
						{/if}
					</p>
					<button
						class="inline-flex min-w-[10rem] items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-black transition-all hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-30"
						onclick={() => onSubmitCards(selectedCardIds)}
						disabled={!isSelectionComplete}
					>
						Submit cards
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
