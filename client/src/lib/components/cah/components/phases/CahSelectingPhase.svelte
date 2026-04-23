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

<div class="space-y-5">
	{#if hasSubmitted}
		<section
			class="rounded-[28px] border border-slate-700/70 bg-slate-900/70 p-5 shadow-xl ring-1 ring-white/5 backdrop-blur-sm sm:p-6"
		>
			<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div>
					<p class="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
						Hand Locked
					</p>
					<h3 class="mt-2 text-2xl font-semibold text-white">Waiting for the rest of the table</h3>
					<p class="mt-2 max-w-2xl text-sm text-slate-400">
						Your answer is submitted. You can keep an eye on the table while the remaining players
						finish choosing.
					</p>
				</div>
				<div
					class="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1.5 text-sm font-semibold text-cyan-200"
				>
					{submittedCount} / {nonJudges.length} submitted
				</div>
			</div>

			<div class="mt-5 h-2 rounded-full bg-slate-800">
				<div
					class="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
					style="width: {nonJudges.length > 0
						? Math.round((submittedCount / nonJudges.length) * 100)
						: 0}%"
				></div>
			</div>

			<div class="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
				<div class="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-5">
					<div
						class="flex items-center justify-center w-16 h-16 bg-cyan-500/20 rounded-full mx-auto"
					>
						<svg
							class="w-8 h-8 text-cyan-300 animate-pulse"
							fill="currentColor"
							viewBox="0 0 20 20"
						>
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<div class="mt-4 text-center">
						<p class="text-lg font-semibold text-white mb-1">Cards submitted</p>
						<p class="text-sm text-slate-400">
							Waiting for {nonJudges.length - submittedCount} more player{nonJudges.length -
								submittedCount ===
							1
								? ''
								: 's'} to submit...
						</p>
					</div>
				</div>

				<div class="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-5">
					<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
						What happens next
					</p>
					<ul class="mt-3 space-y-2 text-sm text-slate-300">
						<li>All players finish selecting their cards.</li>
						<li>The judge sees every anonymous submission.</li>
						<li>The funniest answer earns the point.</li>
					</ul>
				</div>
			</div>
		</section>
	{:else}
		<section
			class="rounded-[28px] border border-slate-700/70 bg-slate-900/70 p-5 shadow-xl ring-1 ring-white/5 backdrop-blur-sm sm:p-6"
		>
			<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div>
					<p class="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Your Hand</p>
					<h3 class="mt-2 text-2xl font-semibold text-white">Build your answer</h3>
					<p class="mt-2 max-w-2xl text-sm text-slate-400">
						Pick {requiredCards} white card{requiredCards === 1 ? '' : 's'} in the order you want them
						played. Your current hand has {currentPlayer.hand.length} cards.
					</p>
				</div>
				<div
					class="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1.5 text-sm font-semibold text-cyan-200"
				>
					Selected {selectedCardIds.length} / {requiredCards}
				</div>
			</div>

			<div class="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
				<div>
					<div
						class="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.22em] text-slate-500"
					>
						<span>Selection progress</span>
						<span>{Math.round((selectedCardIds.length / requiredCards) * 100)}%</span>
					</div>
					<div class="h-2 rounded-full bg-slate-800">
						<div
							class="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-200"
							style="width: {Math.min((selectedCardIds.length / requiredCards) * 100, 100)}%"
						></div>
					</div>
				</div>
				{#if selectedCardIds.length > 0}
					<button
						class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700/70 bg-slate-950/70 px-4 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-900"
						onclick={onClearSelection}
					>
						<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clip-rule="evenodd" />
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
								clip-rule="evenodd"
							/>
						</svg>
						Clear selection
					</button>
				{/if}
			</div>

			{#if selectedCards.length > 0}
				<div class="mt-5 flex gap-3 overflow-x-auto pb-1">
					{#each selectedCards as card, index (card.id)}
						<div
							class="min-w-[14rem] rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4 shadow-sm"
						>
							<div class="mb-2 flex items-center justify-between gap-2">
								<span class="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200"
									>Play #{index + 1}</span
								>
								<span
									class="rounded-full bg-slate-950/60 px-2 py-1 text-[11px] font-semibold text-cyan-100"
									>Locked order</span
								>
							</div>
							<p class="text-sm text-white/90">{card.text}</p>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<div class="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
			{#each currentPlayer.hand as card, index (card.id)}
				{@const isSelected = selectedCardIds.includes(card.id)}
				{@const selectionOrder = selectedCardIds.indexOf(card.id) + 1}
				<button
					class="group relative min-h-[11rem] overflow-hidden rounded-[24px] border p-5 text-left transition-all duration-200
					{isSelected
						? 'border-cyan-400 bg-cyan-50 text-cyan-950 shadow-[0_18px_50px_rgba(34,211,238,0.18)] ring-2 ring-cyan-300/40'
						: 'border-slate-300 bg-white text-black shadow-sm hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-lg'}"
					onclick={() => onCardSelect(card.id)}
					style="animation-delay: {index * 50}ms"
				>
					<div class="flex items-start justify-between gap-3">
						<div
							class="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-xs font-bold text-white shadow-sm"
						>
							{index + 1}
						</div>
						{#if isSelected}
							<div
								class="flex items-center gap-2 rounded-full bg-cyan-500 px-3 py-1 text-xs font-semibold text-white shadow-lg"
							>
								<svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 101.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
								#{selectionOrder}
							</div>
						{/if}
					</div>

					<p
						class="mt-4 text-base leading-relaxed {isSelected ? 'text-cyan-950' : 'text-slate-900'}"
					>
						{card.text}
					</p>

					<div class="mt-5 flex items-center justify-between text-sm">
						<span class="font-medium {isSelected ? 'text-cyan-800' : 'text-slate-500'}">
							{isSelected ? 'Tap to remove from answer' : 'Tap to add to your answer'}
						</span>
					</div>

					<div
						class="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-cyan-500/5 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
					></div>
				</button>
			{/each}
		</div>

		<div class="sticky bottom-3 z-10 lg:bottom-4">
			<div
				class="rounded-[24px] border border-slate-700/70 bg-slate-950/95 p-4 shadow-[0_18px_50px_rgba(2,6,23,0.6)] ring-1 ring-white/5 backdrop-blur-sm sm:p-5"
			>
				<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<div class="text-sm font-semibold text-white">
							{#if isSelectionComplete}
								Ready to submit
							{:else if selectedCardIds.length > 0}
								Keep choosing cards
							{:else}
								Choose your answer
							{/if}
						</div>
						<p class="mt-1 text-sm text-slate-400">
							{#if isSelectionComplete}
								Your answer is complete and ready to lock in.
							{:else}
								Pick {requiredCards - selectedCardIds.length} more card{requiredCards -
									selectedCardIds.length ===
								1
									? ''
									: 's'} to match the black card.
							{/if}
						</p>
					</div>

					<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
						{#if selectedCardIds.length > 0}
							<button
								class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700/70 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
								onclick={onClearSelection}
							>
								Clear
							</button>
						{/if}
						<button
							class="inline-flex min-w-[12rem] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:from-emerald-500 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
							onclick={() => onSubmitCards(selectedCardIds)}
							disabled={!isSelectionComplete}
						>
							<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
									clip-rule="evenodd"
								/>
							</svg>
							Submit cards
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
