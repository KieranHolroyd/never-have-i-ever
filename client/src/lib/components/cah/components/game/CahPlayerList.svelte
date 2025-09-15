<script lang="ts">
	import type { CAHGameState, CAHPlayer } from '$lib/types';
	import CahPlayerAvatar from '../shared/CahPlayerAvatar.svelte';
	import CahBadge from '../shared/CahBadge.svelte';
	import { sortPlayersByScore, getPlayerInitials } from '../../utils/cah-utils';

	interface Props {
		gameState: CAHGameState;
		currentPlayerId: string;
	}

	let { gameState, currentPlayerId }: Props = $props();

	const connectedPlayers = gameState.players.filter(p => p.connected);
	const sortedPlayers = sortPlayersByScore(connectedPlayers);
	const needsMorePlayers = connectedPlayers.length < 3;
</script>

<div class="mb-6">
	<div class="flex items-center justify-between mb-3">
		<h3 class="text-lg font-semibold">
			Players ({connectedPlayers.length})
		</h3>
		{#if needsMorePlayers}
			<div class="flex items-center gap-2 text-sm text-amber-400">
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
				</svg>
				Need {3 - connectedPlayers.length} more player(s)
			</div>
		{/if}
	</div>

	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
		{#each sortedPlayers as player, index}
			<div class="relative bg-slate-700/50 rounded-lg p-4 transition-all duration-200 hover:bg-slate-700/70
				{player.isJudge ? 'ring-2 ring-yellow-400/50 bg-yellow-500/10' :
				 player.id === currentPlayerId ? 'ring-2 ring-blue-400/50 bg-blue-500/10' : ''}">

				<!-- Player Avatar -->
				<div class="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center">
					<span class="text-lg font-bold text-white">{getPlayerInitials(player.name)}</span>
				</div>

				<!-- Player Name -->
				<div class="text-center mb-2">
					<div class="font-semibold text-white truncate">{player.name}</div>
					{#if player.id === currentPlayerId}
						<div class="text-xs text-blue-400 font-medium">(You)</div>
					{/if}
				</div>

				<!-- Score -->
				<div class="text-center mb-2">
					<div class="text-2xl font-bold text-white">{player.score}</div>
					<div class="text-xs text-slate-400">points</div>
				</div>

				<!-- Role Badges -->
				<div class="flex justify-center gap-1">
					{#if player.isJudge}
						<CahBadge variant="judge" size="sm" showIcon={true}>Judge</CahBadge>
					{/if}
					{#if gameState.phase === 'selecting' && player.id === currentPlayerId && !player.isJudge}
						<CahBadge variant="your-turn" size="sm" showIcon={true}>Your Turn</CahBadge>
					{/if}
				</div>

				<!-- Hand Size Indicator -->
				{#if player.hand && player.hand.length > 0}
					<div class="mt-3 pt-2 border-t border-slate-600/50">
						<div class="flex items-center justify-center gap-1 text-xs text-slate-400">
							<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
								<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
							</svg>
							{player.hand.length} cards
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>