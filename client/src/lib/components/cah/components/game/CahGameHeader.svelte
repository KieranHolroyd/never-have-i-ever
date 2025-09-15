<script lang="ts">
	import type { CAHGameState } from '$lib/types';
	import CahProgressBar from '../shared/CahProgressBar.svelte';
	import { getPhaseColor, getPhaseIcon, formatPhaseName } from '../../utils/cah-utils';

	interface Props {
		gameState: CAHGameState;
	}

	let { gameState }: Props = $props();
</script>

<div class="bg-slate-800/50 rounded-lg p-4 mb-4">
	<div class="flex items-center justify-between mb-3">
		<div class="flex items-center gap-4">
			<div class="text-2xl font-bold text-white">
				Round {gameState.currentRound}
			</div>
			<div class="text-sm text-slate-400">
				of {gameState.maxRounds}
			</div>
		</div>

		<!-- Phase Indicator -->
		<div class="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium {getPhaseColor(gameState.phase)}">
			{#if gameState.phase === 'selecting'}
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
					<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
				</svg>
			{:else if gameState.phase === 'judging'}
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
				</svg>
			{:else if gameState.phase === 'scoring'}
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
					<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
				</svg>
			{:else if gameState.phase === 'game_over'}
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
				</svg>
			{:else}
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0 1 1 0 002 0zm-1 4a1 1 0 00-1 1v4a1 1 0 102 0V9a1 1 0 00-1-1z" clip-rule="evenodd"/>
				</svg>
			{/if}
			<span class="capitalize">{gameState.phase.replace('_', ' ')}</span>
		</div>
	</div>

	<!-- Progress Bar -->
	<CahProgressBar
		value={gameState.currentRound}
		max={gameState.maxRounds}
		variant="gradient"
	/>
</div>