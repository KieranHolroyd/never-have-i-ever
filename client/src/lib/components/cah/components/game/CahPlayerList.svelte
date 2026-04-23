<script lang="ts">
	import type { CAHGameState } from '$lib/types';
	import { sortPlayersByScore, getPlayerInitials } from '../../utils/cah-utils';
	import { fly } from 'svelte/transition';
	import { flip } from 'svelte/animate';

	interface Props {
		gameState: CAHGameState;
		currentPlayerId: string;
	}

	let { gameState, currentPlayerId }: Props = $props();

	const connectedPlayers = $derived(gameState.players.filter((p) => p.connected));
	const sortedPlayers = $derived(sortPlayersByScore(connectedPlayers));
	const playersNeeded = $derived(Math.max(0, 3 - connectedPlayers.length));
	const submittedPlayerIds = $derived(
		new Set((gameState.submittedCards ?? []).map((s) => s.playerId))
	);
</script>

<div class="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] overflow-hidden">
	<!-- Header -->
	<div class="border-b border-white/[0.07] px-4 py-3 flex items-center justify-between">
		<span class="text-[11px] font-black uppercase tracking-[0.3em] text-white/30">Leaderboard</span>
		{#if playersNeeded > 0}
			<span class="text-[11px] font-bold text-amber-400/70">Need {playersNeeded} more</span>
		{:else}
			<span class="text-[11px] font-bold text-white/20">{connectedPlayers.length} players</span>
		{/if}
	</div>

	<!-- Player rows -->
	<div class="divide-y divide-white/[0.05]">
		{#each sortedPlayers as player, i (player.id)}
			{@const isCurrentPlayer = player.id === currentPlayerId}
			{@const hasSubmitted = submittedPlayerIds.has(player.id)}
			<div
				class="flex items-center gap-3 px-4 py-3 transition-colors
				{player.isJudge
					? 'bg-amber-500/[0.07]'
					: isCurrentPlayer
						? 'bg-white/[0.05]'
						: 'hover:bg-white/[0.03]'}"
				in:fly={{ y: 6, duration: 180 }}
				animate:flip={{ duration: 200 }}
			>
				<!-- Rank -->
				<span class="w-4 shrink-0 text-center text-xs font-black text-white/20">{i + 1}</span>

				<!-- Avatar -->
				<div
					class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black
					{player.isJudge
						? 'bg-amber-500/20 text-amber-200'
						: isCurrentPlayer
							? 'bg-white/20 text-white'
							: 'bg-white/10 text-white/60'}"
				>
					{getPlayerInitials(player.name)}
				</div>

				<!-- Name + status -->
				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-bold {isCurrentPlayer ? 'text-white' : 'text-white/70'}">
						{player.name}
						{#if isCurrentPlayer}<span class="text-white/30 font-normal"> (you)</span>{/if}
					</p>
					<p class="text-[11px] text-white/30">
						{#if player.isJudge}
							judging
						{:else if gameState.phase === 'selecting' && hasSubmitted}
							submitted ✓
						{:else if gameState.phase === 'selecting'}
							choosing…
						{:else}
							watching
						{/if}
					</p>
				</div>

				<!-- Score -->
				<div class="shrink-0 text-right">
					<span class="text-xl font-black {i === 0 ? 'text-white' : 'text-white/50'}"
						>{player.score}</span
					>
					{#if player.isJudge}
						<div class="text-[10px] font-black uppercase tracking-widest text-amber-500/70">
							judge
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>
