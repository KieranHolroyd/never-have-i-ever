<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import type { CAHGameState } from '$lib/types';
	import { sortPlayersByScore } from '../../utils/cah-utils';
	import { Card, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';

	interface Props {
		gameState: CAHGameState;
		currentPlayerId: string;
		onResetGame: () => void;
	}

	let { gameState, currentPlayerId, onResetGame }: Props = $props();

	const connectedPlayers = $derived(gameState.players.filter((p) => p.connected));
	const sortedPlayers = $derived(sortPlayersByScore(connectedPlayers));

	function rankLabel(rank: number) {
		if (rank === 0) return '🥇';
		if (rank === 1) return '🥈';
		if (rank === 2) return '🥉';
		return `#${rank + 1}`;
	}
</script>

<div class="mx-auto max-w-lg space-y-4" data-testid="cah-game-over" in:fade={{ duration: 300 }}>
	<Card class="border-violet-500/30 text-center">
		<CardHeader>
			<CardDescription>Game over</CardDescription>
			<CardTitle class="text-3xl">Final scores</CardTitle>
			<CardDescription>
				{gameState.currentRound} round{gameState.currentRound === 1 ? '' : 's'} played
			</CardDescription>
		</CardHeader>
	</Card>

	<ul class="space-y-3">
		{#each sortedPlayers as player, i (player.id)}
			<li in:fly={{ y: 10, duration: 280, delay: i * 60, easing: backOut }}>
				<Card class="flex-row items-center gap-3 p-4">
					<span class="text-2xl">{rankLabel(i)}</span>
					<span class="min-w-0 flex-1 truncate text-lg font-semibold">
						{player.name}
						{#if player.id === currentPlayerId}
							<span class="text-muted-foreground text-sm font-normal"> (you)</span>
						{/if}
					</span>
					<Badge variant="secondary">{player.score}</Badge>
				</Card>
			</li>
		{/each}
	</ul>

	<Button type="button" variant="emerald" size="lg" class="w-full" onclick={onResetGame}>
		Play again
	</Button>
</div>
