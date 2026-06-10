<script lang="ts">
	import type { CAHGameState } from '$lib/types';
	import { fade } from 'svelte/transition';
	import { Card, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';

	interface Props {
		gameState: CAHGameState;
	}

	let { gameState }: Props = $props();
</script>

{#if gameState.currentBlackCard}
	<div in:fade={{ duration: 150 }} class="flex items-start gap-5">
		<Card
			class="relative mx-auto flex min-h-52 w-full max-w-lg shrink-0 flex-col justify-between border-violet-500/30 bg-black p-0 text-white shadow-lg sm:min-h-60"
		>
			{#if gameState.currentBlackCard.pick > 1}
				<Badge class="absolute right-4 top-4" variant="outline">Pick {gameState.currentBlackCard.pick}</Badge>
			{/if}

			<CardContent class="pt-6 sm:pt-8">
				<p class="pr-14 text-xl font-bold leading-snug sm:text-2xl">
					{gameState.currentBlackCard.text}
				</p>
			</CardContent>

			<CardFooter class="border-t border-white/10">
				<span class="text-muted-foreground text-[10px] font-medium uppercase tracking-widest">
					Cards Against Humanity
				</span>
				<span class="text-muted-foreground ml-auto text-xs font-medium">
					{gameState.currentRound}/{gameState.maxRounds}
				</span>
			</CardFooter>
		</Card>

		<Card class="hidden flex-1 sm:block">
			<CardContent>
				<p class="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-widest">
					How to play this round
				</p>
				<p class="text-muted-foreground text-sm leading-relaxed">
					{#if gameState.currentBlackCard.pick > 1}
						Choose <strong class="text-foreground">{gameState.currentBlackCard.pick} white cards</strong>
						in order. The judge will see all submissions anonymously.
					{:else}
						Choose your <strong class="text-foreground">single best white card</strong> to complete the prompt.
						The judge picks the funniest answer.
					{/if}
				</p>
			</CardContent>
		</Card>
	</div>
{/if}
