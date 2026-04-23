<script lang="ts">
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
</script>

<div class="space-y-4">
	<!-- Game over header -->
	<div class="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-6 text-center">
		<p class="text-[11px] font-black uppercase tracking-[0.3em] text-white/25">Game over</p>
		<h2 class="mt-2 text-3xl font-black text-white">Final Scores</h2>
		<p class="mt-1 text-sm text-white/40">
			{gameState.currentRound} round{gameState.currentRound === 1 ? '' : 's'} played
		</p>
	</div>

	<!-- Leaderboard -->
	<div class="overflow-hidden rounded-2xl border border-white/[0.07]">
		{#each sortedPlayers as player, i (player.id)}
			<div
				class="flex items-center gap-4 border-b border-white/[0.05] px-5 py-4 last:border-0
				{i === 0 ? 'bg-white/[0.05]' : 'bg-[#1a1a1a]'}"
			>
				<!-- Rank -->
				<span
					class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black
					{i === 0 ? 'bg-white text-black' : i === 1 ? 'bg-white/20 text-white' : i === 2 ? 'bg-white/10 text-white/60' : 'bg-transparent text-white/25 text-xs'}"
				>
					{i + 1}
				</span>

				<!-- Avatar -->
				<div
					class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black
					{i === 0 ? 'bg-white/20 text-white' : 'bg-white/10 text-white/50'}"
				>
					{player.name.charAt(0).toUpperCase()}
				</div>

				<!-- Name -->
				<div class="min-w-0 flex-1">
					<p class="truncate font-black {i === 0 ? 'text-white' : 'text-white/60'}">
						{player.name}
						{#if player.id === currentPlayerId}
							<span class="font-normal text-white/30"> (you)</span>
						{/if}
					</p>
				</div>

				<!-- Score -->
				<span class="shrink-0 text-2xl font-black {i === 0 ? 'text-white' : 'text-white/40'}">
					{player.score}
				</span>
			</div>
		{/each}
	</div>

	<!-- Play again -->
	<button
		class="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-4 text-sm font-black text-white transition-colors hover:bg-white/[0.08]"
		onclick={onResetGame}
	>
		Play again
	</button>
</div>
