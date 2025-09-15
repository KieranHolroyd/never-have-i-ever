<script lang="ts">
	import type { CAHPlayer } from '$lib/types';

	interface Props {
		winnerPlayer: CAHPlayer | null;
	}

	let { winnerPlayer }: Props = $props();
</script>

<div class="text-center py-12">
	{#if winnerPlayer}
		<div class="mb-8">
			<!-- Winner Celebration -->
			<div class="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 rounded-full mb-6">
				<svg class="w-12 h-12 text-green-400" fill="currentColor" viewBox="0 0 20 20">
					<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
				</svg>
			</div>

			<h2 class="text-3xl font-bold text-green-400 mb-4">Round Winner!</h2>

			<!-- Winner Card -->
			<div class="bg-green-500/10 border border-green-500/30 rounded-lg p-6 max-w-md mx-auto mb-6">
				<div class="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
					<span class="text-xl font-bold text-white">{winnerPlayer.name.charAt(0).toUpperCase()}</span>
				</div>
				<h3 class="text-xl font-bold text-white mb-2">{winnerPlayer.name}</h3>
				<div class="flex items-center justify-center gap-2 text-green-400">
					<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
						<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
					</svg>
					<span class="font-semibold">+1 Point!</span>
				</div>
				<div class="text-sm text-green-300 mt-2">
					New Score: {winnerPlayer.score}
				</div>
			</div>
		</div>
	{/if}

	<!-- Next Round Countdown -->
	<div class="max-w-sm mx-auto">
		<div class="flex items-center justify-center gap-3 text-slate-400 mb-2">
			<svg class="w-5 h-5 animate-spin" fill="currentColor" viewBox="0 0 20 20">
				<path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
			</svg>
			<span class="font-medium">Preparing Next Round...</span>
		</div>
		<div class="w-full bg-slate-700 rounded-full h-2">
			<div class="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full animate-pulse"></div>
		</div>
	</div>
</div>