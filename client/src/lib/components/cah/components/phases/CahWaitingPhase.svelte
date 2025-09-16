<script lang="ts">
	import type { CAHGameState } from '$lib/types';
	import CahProgressBar from '../shared/CahProgressBar.svelte';

	interface Props {
		gameState: CAHGameState;
	}

	let { gameState }: Props = $props();

	const connectedPlayers = gameState.players.filter(p => p.connected);
	const isReady = connectedPlayers.length >= 3;
</script>

<div class="text-center py-12" data-testid="cah-waiting">
	<div class="mb-6">
		<div class="inline-flex items-center justify-center w-16 h-16 bg-slate-800 rounded-full mb-4">
			<svg class="w-8 h-8 text-slate-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
				<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0 1 1 0 002 0zm-1 4a1 1 0 00-1 1v4a1 1 0 102 0V9a1 1 0 00-1-1z" clip-rule="evenodd"/>
			</svg>
		</div>
		<h2 class="text-2xl font-bold text-white mb-2">
			{#if gameState.waitingForPlayers}
				Waiting for Players
			{:else}
				Preparing Game
			{/if}
		</h2>
		<p class="text-slate-400 max-w-md mx-auto">
			{#if gameState.waitingForPlayers}
				The game will begin once more players join the room.
			{:else}
				Setting up the game... Get ready for some hilarious moments!
			{/if}
		</p>
	</div>

	<!-- Player Count Progress -->
	<div class="max-w-xs mx-auto mb-6">
		<div class="flex justify-between text-sm text-slate-400 mb-2">
			<span>Players</span>
			<span>{connectedPlayers.length}/∞</span>
		</div>
		<CahProgressBar
			value={Math.min(connectedPlayers.length * 25, 100)}
			max={100}
			variant={isReady ? "gradient" : "default"}
		/>
		{#if isReady}
			<div class="mt-3 flex items-center justify-center gap-2 text-sm text-green-400">
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
				</svg>
				Ready to start!
			</div>
		{:else}
			<div class="mt-3 flex items-center justify-center gap-2 text-sm text-amber-400">
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
				</svg>
				Need {3 - connectedPlayers.length} more player(s)
			</div>
		{/if}
	</div>
</div>