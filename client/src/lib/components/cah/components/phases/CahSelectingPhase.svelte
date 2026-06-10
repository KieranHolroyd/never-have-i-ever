<script lang="ts">
	import type { CAHGameState, CAHPlayer } from '$lib/types';
	import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';

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
	const submitProgress = $derived(
		nonJudges.length > 0 ? Math.round((submittedCount / nonJudges.length) * 100) : 0
	);
	const selectedCards = $derived(
		selectedCardIds
			.map((cardId) => currentPlayer.hand.find((card) => card.id === cardId))
			.filter((card) => card !== undefined)
	);
</script>

<div class="space-y-4">
	{#if hasSubmitted}
		<Card>
			<CardHeader>
				<CardDescription>Hand locked</CardDescription>
				<CardTitle>Waiting for the table</CardTitle>
				<Badge variant="outline">{submittedCount}/{nonJudges.length}</Badge>
			</CardHeader>
			<CardContent class="space-y-4">
				<CardDescription>
					{submittedCount} of {nonJudges.length} players have submitted.
				</CardDescription>
				<Progress value={submitProgress} />
			</CardContent>
		</Card>
	{:else}
		<div class="flex items-center justify-between">
			<div>
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-widest">Your hand</p>
				<h3 class="text-lg font-bold">
					Choose {requiredCards} card{requiredCards === 1 ? '' : 's'}
				</h3>
			</div>
			<div class="flex items-center gap-3">
				{#if selectedCardIds.length > 0}
					<Button type="button" variant="ghost" size="sm" onclick={onClearSelection}>
						Clear
					</Button>
				{/if}
				<Badge variant="secondary">{selectedCardIds.length}/{requiredCards}</Badge>
			</div>
		</div>

		{#if selectedCards.length > 0}
			<div class="flex gap-2 overflow-x-auto pb-1">
				{#each selectedCards as card, index (card.id)}
					<Card class="min-w-[11rem] bg-white text-black">
						<CardContent>
							<p class="text-muted-foreground mb-1 text-[10px] font-medium uppercase tracking-widest">
								Play #{index + 1}
							</p>
							<p class="text-xs font-medium leading-relaxed">{card.text}</p>
						</CardContent>
					</Card>
				{/each}
			</div>
		{/if}

		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
			{#each currentPlayer.hand as card (card.id)}
				{@const isSelected = selectedCardIds.includes(card.id)}
				{@const selectionOrder = selectedCardIds.indexOf(card.id) + 1}
				<Card
					class="relative min-h-[9rem] cursor-pointer bg-white text-black transition-all {isSelected
						? 'ring-2 ring-foreground -translate-y-1'
						: 'hover:-translate-y-0.5'}"
					onclick={() => onCardSelect(card.id)}
				>
					<CardContent>
						{#if isSelected}
							<Badge class="absolute right-2.5 top-2.5" variant="default">{selectionOrder}</Badge>
						{/if}
						<p class="pr-7 text-sm font-medium leading-snug">{card.text}</p>
						<p class="text-muted-foreground absolute bottom-3 left-4 text-[10px] font-medium uppercase tracking-widest">
							{isSelected ? 'selected' : 'tap to play'}
						</p>
					</CardContent>
				</Card>
			{/each}
		</div>

		<div class="sticky bottom-3 z-10">
			<Card>
				<CardFooter class="flex items-center justify-between gap-4">
					<p class="text-muted-foreground text-sm">
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
					<Button
						type="button"
						variant="default"
						class="min-w-[10rem]"
						onclick={() => onSubmitCards(selectedCardIds)}
						disabled={!isSelectionComplete}
					>
						Submit cards
					</Button>
				</CardFooter>
			</Card>
		</div>
	{/if}
</div>
