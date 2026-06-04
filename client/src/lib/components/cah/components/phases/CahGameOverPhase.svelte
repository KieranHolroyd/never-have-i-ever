<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import type { CAHGameState } from '$lib/types';
	import { sortPlayersByScore } from '../../utils/cah-utils';

	interface Props {
		gameState: CAHGameState;
		currentPlayerId: string;
		onResetGame: () => void;
	}

	let { gameState, currentPlayerId, onResetGame }: Props = $props();

	const connectedPlayers = $derived(gameState.players.filter((p) => p.connected));
	const sortedPlayers = $derived(sortPlayersByScore(connectedPlayers));

	function podiumClass(rank: number) {
		if (rank === 0) return 'site-podium-gold';
		if (rank === 1) return 'site-podium-silver';
		if (rank === 2) return 'site-podium-bronze';
		return 'site-surface';
	}

	function rankLabel(rank: number) {
		if (rank === 0) return '🥇';
		if (rank === 1) return '🥈';
		if (rank === 2) return '🥉';
		return `#${rank + 1}`;
	}
</script>

<div class="mx-auto max-w-lg space-y-4" data-testid="cah-game-over" in:fade={{ duration: 300 }}>
	<div class="site-surface site-accent-cah relative overflow-hidden px-4 py-8 text-center">
		<p class="site-phase-label text-violet-300/80">Game over</p>
		<h2 class="mt-2 text-3xl font-black text-white">Final scores</h2>
		<p class="mt-1 text-sm text-white/45">
			{gameState.currentRound} round{gameState.currentRound === 1 ? '' : 's'} played
		</p>
	</div>

	<ul class="space-y-3">
		{#each sortedPlayers as player, i (player.id)}
			<li
				class={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${podiumClass(i)}`}
				in:fly={{ y: 10, duration: 280, delay: i * 60, easing: backOut }}
			>
				<span class="text-2xl">{rankLabel(i)}</span>
				<span class="min-w-0 flex-1 truncate text-lg font-black text-white">
					{player.name}
					{#if player.id === currentPlayerId}
						<span class="text-sm font-normal text-white/40"> (you)</span>
					{/if}
				</span>
				<span class="rounded-full bg-violet-600 px-3 py-1 text-sm font-black text-white">
					{player.score}
				</span>
			</li>
		{/each}
	</ul>

	<button type="button" class="site-btn-primary w-full py-4 text-lg" onclick={onResetGame}>
		Play again
	</button>
</div>
