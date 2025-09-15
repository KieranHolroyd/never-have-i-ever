<script lang="ts">
	import type { CAHGameState, CAHPlayer } from '$lib/types';
	import { sortPlayersByScore } from '../../utils/cah-utils';

	interface Props {
		gameState: CAHGameState;
		currentPlayerId: string;
		onResetGame: () => void;
	}

	let { gameState, currentPlayerId, onResetGame }: Props = $props();

	const connectedPlayers = gameState.players.filter(p => p.connected);
	const sortedPlayers = sortPlayersByScore(connectedPlayers);
</script>

<div class="text-center py-12">
	<!-- Game Over Header -->
	<div class="mb-8">
		<div class="inline-flex items-center justify-center w-20 h-20 bg-yellow-500/20 rounded-full mb-6">
			<svg class="w-12 h-12 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
				<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
			</svg>
		</div>
		<h2 class="text-3xl font-bold text-yellow-400 mb-4">Game Over!</h2>
		<p class="text-slate-400 max-w-md mx-auto">
			What an amazing game! Here are the final results.
		</p>
	</div>

	<!-- Final Leaderboard -->
	<div class="max-w-2xl mx-auto">
		<h3 class="text-xl font-semibold text-white mb-6">Final Leaderboard</h3>
		<div class="space-y-3">
			{#each sortedPlayers as player, i}
				<div class="relative bg-slate-700/50 rounded-lg p-4 transition-all duration-200
					{i === 0 ? 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30' :
					 i === 1 ? 'bg-gradient-to-r from-slate-400/20 to-slate-500/20 border border-slate-400/30' :
					 i === 2 ? 'bg-gradient-to-r from-amber-600/20 to-amber-700/20 border border-amber-600/30' :
					 'border border-slate-600/30'}">

					<!-- Rank Badge -->
					<div class="absolute -left-4 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
						{i === 0 ? 'bg-yellow-500 text-black' :
						 i === 1 ? 'bg-slate-400 text-black' :
						 i === 2 ? 'bg-amber-600 text-white' :
						 'bg-slate-600 text-white'}">
						{i + 1}
					</div>

					<!-- Trophy for winner -->
					{#if i === 0}
						<div class="absolute -right-4 top-1/2 transform -translate-y-1/2">
							<svg class="w-8 h-8 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
								<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
							</svg>
						</div>
					{/if}

					<div class="flex items-center justify-between ml-8">
						<div class="flex items-center gap-4">
							<!-- Player Avatar -->
							<div class="w-12 h-12 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center">
								<span class="text-lg font-bold text-white">{player.name.charAt(0).toUpperCase()}</span>
							</div>

							<!-- Player Info -->
							<div class="text-left">
								<div class="flex items-center gap-2">
									<span class="font-bold text-white text-lg">{player.name}</span>
									{#if player.id === currentPlayerId}
										<span class="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">(You)</span>
									{/if}
								</div>
								<div class="text-sm text-slate-400">
									Played {gameState.maxRounds} rounds
								</div>
							</div>
						</div>

						<!-- Score -->
						<div class="text-right">
							<div class="text-3xl font-bold text-white">{player.score}</div>
							<div class="text-sm text-slate-400">points</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Play Again Button -->
	<div class="mt-8">
		<button
			class="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-600 rounded-lg text-white font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
			onclick={onResetGame}
		>
			<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
				<path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
			</svg>
			Play Again
		</button>
	</div>
</div>