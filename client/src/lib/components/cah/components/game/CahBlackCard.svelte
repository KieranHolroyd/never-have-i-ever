<script lang="ts">
	import type { CAHGameState } from '$lib/types';
	import CahBadge from '../shared/CahBadge.svelte';
    import { fade, scale } from 'svelte/transition';

	interface Props {
		gameState: CAHGameState;
	}

	let { gameState }: Props = $props();
</script>

{#if gameState.currentBlackCard}
	<div class="mb-6">
		<div class="flex items-center justify-between mb-3">
			<h3 class="text-lg font-semibold">Black Card</h3>
			{#if gameState.currentBlackCard.pick > 1}
				<CahBadge variant="info" size="sm" showIcon={true}>
					Pick {gameState.currentBlackCard.pick}
				</CahBadge>
			{/if}
		</div>
		<div class="bg-gradient-to-br from-slate-900 to-black border border-slate-700 rounded-lg p-6 text-center shadow-2xl" in:fade={{ duration: 150 }}>
			<div in:scale={{ start: 0.98, duration: 150 }}>
			<div class="flex items-center justify-center mb-4">
				<div class="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center">
					<span class="text-xs font-bold text-slate-400">Q</span>
				</div>
			</div>
			<p class="text-xl font-medium text-white leading-relaxed">{gameState.currentBlackCard.text}</p>
			{#if gameState.currentBlackCard.pick > 1}
				<div class="mt-4 pt-4 border-t border-slate-700/50">
					<p class="text-sm text-slate-400">
						Select exactly {gameState.currentBlackCard.pick} white cards to complete this prompt
					</p>
				</div>
			{/if}
			</div>
		</div>
	</div>
{/if}