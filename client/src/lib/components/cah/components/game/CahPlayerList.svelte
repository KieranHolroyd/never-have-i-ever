<script lang="ts">
	import type { CAHGameState } from '$lib/types';
	import CahBadge from '../shared/CahBadge.svelte';
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
	const submittedPlayerIds = $derived(new Set((gameState.submittedCards ?? []).map((s) => s.playerId)));
</script>

<section class="rounded-[28px] border border-slate-700/70 bg-slate-900/70 p-4 shadow-xl ring-1 ring-white/5 backdrop-blur-sm sm:p-5">
	<div class="mb-4 flex items-start justify-between gap-3">
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Table</p>
			<h3 class="mt-1 text-lg font-semibold text-white">Players</h3>
			<p class="mt-1 text-sm text-slate-400">{connectedPlayers.length} connected in this round</p>
		</div>
		{#if playersNeeded > 0}
			<div class="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
				<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
						clip-rule="evenodd"
					/>
				</svg>
				Need {playersNeeded} more
			</div>
		{/if}
	</div>

	<div class="flex gap-3 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
		{#each sortedPlayers as player (player.id)}
			{@const isCurrentPlayer = player.id === currentPlayerId}
			{@const hasSubmitted = submittedPlayerIds.has(player.id)}
			<article
				class="min-w-[16rem] rounded-2xl border p-4 transition-all duration-200 lg:min-w-0
				{player.isJudge
					? 'border-amber-400/40 bg-amber-500/10 shadow-[0_12px_30px_rgba(245,158,11,0.12)]'
					: isCurrentPlayer
						? 'border-cyan-400/35 bg-cyan-500/10 shadow-[0_12px_30px_rgba(34,211,238,0.10)]'
						: 'border-slate-700/70 bg-slate-800/70 hover:border-slate-600 hover:bg-slate-800'}"
				in:fly={{ y: 8, duration: 200 }}
				animate:flip
			>
				<div class="flex items-start gap-3">
					<div class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-sm font-bold text-white shadow-inner shadow-black/30">
						{getPlayerInitials(player.name)}
					</div>
					<div class="min-w-0 flex-1">
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<p class="truncate text-sm font-semibold text-white">{player.name}</p>
								<p class="mt-1 text-xs text-slate-400">
									{#if player.isJudge}
										Reading submissions
									{:else if gameState.phase === 'selecting' && hasSubmitted}
										Cards locked in
									{:else if gameState.phase === 'selecting'}
										Still choosing
									{:else}
										Watching the round
									{/if}
								</p>
							</div>
							<div class="text-right">
								<div class="text-xl font-semibold text-white">{player.score}</div>
								<div class="text-[11px] uppercase tracking-[0.18em] text-slate-500">Points</div>
							</div>
						</div>
					</div>
				</div>

				<div class="mt-4 flex flex-wrap items-center gap-2">
					{#if player.isJudge}
						<CahBadge variant="judge" size="sm" showIcon={true}>Judge</CahBadge>
					{/if}
					{#if isCurrentPlayer}
						<CahBadge variant="your-turn" size="sm" showIcon={true}>You</CahBadge>
					{/if}
					{#if gameState.phase === 'selecting' && !player.isJudge && isCurrentPlayer}
						<CahBadge variant="info" size="sm" showIcon={true}>Play Cards</CahBadge>
					{/if}
					<div class="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-300">
						<svg class="h-3.5 w-3.5 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
							<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						{player.hand?.length ?? 0} cards
					</div>
				</div>
			</article>
		{/each}
	</div>
</section>
